import streamlit as st

from agent.loop import run_agent

st.set_page_config(page_title="Business Agent", page_icon="🤖")
st.title("Business Agent")

if "messages" not in st.session_state:
    st.session_state.messages = []  # for display
    st.session_state.history = []   # for the API

auto_approve = st.sidebar.checkbox("Approve risky actions (send, write)", value=False)
st.sidebar.caption("Audit log: logs/audit.jsonl")

for m in st.session_state.messages:
    with st.chat_message(m["role"]):
        st.markdown(m["content"])

if prompt := st.chat_input("Ask the agent..."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    st.session_state.history.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        status = st.status("Agent is working...", expanded=False)

        def on_event(e):
            mark = "✅" if e["allowed"] else "⛔"
            status.write(f"{mark} `{e['tool']}` {e['input']}")

        answer = run_agent(
            st.session_state.history,
            approve=lambda name, args: auto_approve,
            on_event=on_event,
        )
        status.update(label="Done", state="complete")
        st.markdown(answer)
    st.session_state.messages.append({"role": "assistant", "content": answer})
