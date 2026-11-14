"""Conservative matching of original itemized rows; never a billing verdict."""

import re
from collections import Counter, defaultdict
from datetime import date
from decimal import Decimal

from billing.consistency import MONEY

# These markers can explain repeats. This is a conservative screen, not a codebook.
REPEAT_MODIFIERS = {"59", "76", "77", "91", "XE", "XP", "XS", "XU"}


def normalize(value):
    return re.sub(r"\s+", "", value or "").upper()


def dates_in(text):
    values = set()
    for year, month, day in re.findall(r"\b(\d{4})-(\d{2})-(\d{2})\b", text):
        try:
            values.add(date(int(year), int(month), int(day)).isoformat())
        except ValueError:
            pass
    for month, day, year in re.findall(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b", text):
        try:
            values.add(date(int(year), int(month), int(day)).isoformat())
        except ValueError:
            pass
    return values


def check_duplicates(extraction):
    groups = defaultdict(list)
    skipped = []
    lines = extraction.service_lines
    eligible = 0
    positions = Counter((line.page, line.row) for line in lines)
    applicable = extraction.type in ("eob", "medical_bill")
    for line in lines if applicable else []:
        reason = None
        code = normalize(line.code)
        modifiers = tuple(
            sorted(filter(None, re.split(r"[,\s;/]+", (line.modifiers or "").upper())))
        )
        if normalize(line.modifiers) in {"NONE", "NOMODIFIERS", "-"}:
            modifiers = ()
        if positions[(line.page, line.row)] > 1:
            reason = "Repeated source position: extraction may have counted the same row twice."
        elif line.kind != "charge":
            reason = "This is not an original service charge (summary, copy, adjustment or unknown row)."
        elif not line.scope_confirmed:
            reason = "Same patient, provider and claim scope could not be confirmed."
        elif line.currency != "USD":
            reason = "USD currency was not confirmed."
        elif not code or not re.fullmatch(r"[A-Z0-9]{3,10}", code):
            reason = "A usable printed service code is missing."
        elif (
            line.modifiers is None
            or line.units is None
            or line.charge is None
            or line.service_context is None
        ):
            reason = "Modifiers, quantity, service context or line charge are missing or unreadable."
        elif Decimal(line.units) <= 0 or Decimal(line.charge) <= 0:
            reason = "Zero or credit/adjustment amounts are outside this duplicate-charge screen."
        elif REPEAT_MODIFIERS.intersection(modifiers):
            reason = "A repeat/distinct-service modifier is present."
        elif any(not re.fullmatch(r"[A-Z0-9]{2}", modifier) for modifier in modifiers):
            reason = "A service modifier could not be read as a two-character code."
        elif line.service_context and normalize(line.service_context) not in normalize(
            line.evidence
        ):
            reason = "The service time/site/specimen/encounter context is not supported by the source excerpt."
        elif dates_in(line.evidence) != {line.service_date}:
            reason = "A single valid service date could not be verified in the source excerpt."
        elif not any(
            Decimal(value) == Decimal(line.units)
            for value in re.findall(
                r"\b(?:units?|qty|quantity)\s*[:=|]?\s*(\d+(?:\.\d+)?)\b",
                line.evidence,
                re.IGNORECASE,
            )
        ):
            reason = "A labeled quantity could not be verified in the source excerpt."
        elif any(
            modifier not in re.findall(r"[A-Z0-9]+", line.evidence.upper())
            for modifier in modifiers
        ):
            reason = "The source excerpt does not support the extracted modifiers."
        elif code not in re.findall(r"[A-Z0-9]+", line.evidence.upper()) or not any(
            Decimal(m.group().replace(",", "")) == Decimal(line.charge)
            for m in MONEY.finditer(line.evidence)
        ):
            reason = "The source excerpt does not support the service code and charge."
        if reason:
            skipped.append({"page": line.page, "row": line.row, "reason": reason})
            continue
        key = (
            line.scope,
            line.service_date,
            code,
            modifiers,
            Decimal(line.units),
            Decimal(line.charge),
            normalize(line.service_context),
        )
        groups[key].append(line)
        eligible += 1
    findings = []
    for (
        scope,
        service_date,
        code,
        modifiers,
        units,
        charge,
        context,
    ), rows in groups.items():
        if len(rows) < 2:
            continue
        findings.append(
            {
                "rule": "possible_duplicate_service",
                "status": "possible_duplicate",
                "scope": scope,
                "service_date": service_date,
                "code": code,
                "modifiers": list(modifiers),
                "units": format(units, "f"),
                "charge_per_row": f"{charge:.2f}",
                "service_context": rows[0].service_context,
                "sources": [
                    {"page": row.page, "row": row.row, "evidence": row.evidence}
                    for row in rows
                ],
                "explanation": "Distinct printed rows have the same extracted case, service date, code, modifiers, quantity, charge and shown service context. Ask whether they represent separate services or duplicate billing. Repeated services can be legitimate; no refund or savings is established.",
            }
        )
    coverage = (
        "complete"
        if applicable and lines and extraction.service_lines_complete and not skipped
        else "partial"
        if eligible
        else "not_checked"
    )
    status = (
        "review_needed"
        if findings
        else "no_candidates"
        if eligible >= 2
        else "not_checked"
    )
    return {
        "status": status,
        "coverage": coverage,
        "rows_extracted": len(lines) if applicable else 0,
        "rows_checked": eligible,
        "extraction_complete": bool(
            applicable and lines and extraction.service_lines_complete
        ),
        "findings": findings,
        "skipped": skipped,
        "summary": f"Possible duplicate groups: {len(findings)}. Rows eligible for matching: {eligible}."
        if applicable
        else "Duplicate-service checks support itemized EOBs and provider bills only.",
        "limitation": "Only up to 12 extracted original rows are considered. This is exact matching within the same patient/provider/claim scope, not a full duplicate-billing audit. Missing dates, quantities or codes, different amounts and separate claims may hide duplicates. AI reading and scope can be wrong; verify original rows. No candidates does not mean the bill is correct.",
    }
