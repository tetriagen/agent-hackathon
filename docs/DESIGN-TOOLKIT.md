# Набор для дизайна и проверки интерфейса

Подготовлены именно три пункта: DESIGN.md, Vercel Web Design Guidelines и Playwright CLI.
Taste Skill и Image to Code не добавлены. Конкретный кейс не выбран.

## Что уже лежит в репозитории

| Часть | Файлы | Назначение |
| --- | --- | --- |
| Дизайн-система | ../DESIGN.md | Нейтральные правила для будущего интерфейса |
| Пример Awesome DESIGN.md | ../design/references/linear-DESIGN.md | Оригинальный референс Linear из коллекции VoltAgent |
| Vercel Web Design Guidelines | ../.agents/skills/web-design-guidelines/SKILL.md | Проверка интерфейса; рядом сохранена офлайн-копия правил |
| Playwright CLI | ../.agents/skills/playwright-cli/SKILL.md | Оригинальный навык Microsoft со всеми его reference-файлами |
| Подключение к проекту | ../AGENTS.md | Указывает Codex, какие материалы читать |

Скопированы файлы навыков, а не только ссылки на них.
Взята одна дизайн-система из Awesome DESIGN.md, а не вся коллекция.
Корневой DESIGN.md — самостоятельный нейтральный шаблон, а не копия Linear.
Исходники, версии и лицензии перечислены в ../third_party/SOURCES.md.

## На ноутбуке

Если репозиторий уже скачан:

```bash
git pull --ff-only
```

Если ещё нет, клонируйте приватный репозиторий после входа в GitHub:

```bash
git clone https://github.com/tetriagen/agent-hackathon.git
cd agent-hackathon
```

Откройте эту папку в Codex. Навыки находятся в стандартной папке проекта
.agents/skills. Если интерфейс Codex не показывает их в списке, попросите его
прочитать соответствующий SKILL.md по пути — AGENTS.md тоже указывает эти пути.
Это не установка в личный каталог плагинов ChatGPT и не глобальная установка на компьютер.

### Установить браузерный инструмент

Нужны Node.js 20+ (лучше актуальный LTS), npm и интернет.
В корне проекта выполните:

```bash
npm install
npm run browser:help
npm run browser:install -- chromium
```

В package.json закреплён @playwright/cli 0.1.24, соответствующий скачанному исходнику.
Команда browser:install скачивает браузер. При первом npm install создаётся package-lock.json;
сохраните его после успешной проверки на ноутбуке.
На Linux могут дополнительно понадобиться системные библиотеки браузера.
Проверяйте сообщения установщика; зависимости ОС не входят в репозиторий.

Чтобы CLI использовал скачанный Chromium, а не искал системный Google Chrome,
создайте локальный файл `.playwright/cli.config.json`:

```json
{
  "browser": {
    "browserName": "chromium",
    "launchOptions": {
      "channel": "chromium"
    }
  }
}
```

На этом ноутбуке файл уже настроен. Каталог `.playwright/` исключён из Git.

### Проверить приложение

Запустите Python-приложение по основному README. Ему нужны настроенные .env,
доступ к модели и подготовленная демобаза. Дизайн-навыки не заменяют эту настройку.
В другом терминале:

```bash
npx --no-install playwright-cli open http://localhost:8501
npx --no-install playwright-cli snapshot
npx --no-install playwright-cli resize 390 844
npx --no-install playwright-cli screenshot --filename=artifacts/ui-mobile.png
npx --no-install playwright-cli resize 1440 900
npx --no-install playwright-cli screenshot --filename=artifacts/ui-desktop.png
npx --no-install playwright-cli console error
npx --no-install playwright-cli close
```

Папка artifacts уже предусмотрена. Не публикуйте скриншоты с приватными данными.
Локальная установка проверена 13 ноября 2026 года: Node.js 26.13.1,
npm 11.20.0, Playwright CLI 0.1.24, Chromium 158.0.8127.18.
Node.js установлен в пользовательский каталог, команды node/npm/npx доступны через PATH.
Проверены открытие приложения, ввод и очистка текста без отправки,
снимки при 390×844 и 1440×900; в консоли браузера ошибок не было.
Снимки сохранены в `artifacts/setup-mobile.png` и `artifacts/setup-desktop.png`.
Проверка использовала фиктивный API-ключ и отдельный локальный порт 18501;
ответы модели и платные API-вызовы не проверялись. Тестовые процессы остановлены.

## Что написать Codex

«Прочитай AGENTS.md и DESIGN.md. Когда я дам кейс, оформи интерфейс под него,
сохраняя Streamlit. Используй web-design-guidelines для проверки, затем
playwright-cli для проверки работающего приложения. Сейчас не придумывай бизнес-кейс».

Для отдельного ревью:
«Прочитай .agents/skills/web-design-guidelines/SKILL.md и проверь app.py.
Отдели применимые к Streamlit замечания от правил для React».

Для проверки браузера:
«Используй .agents/skills/playwright-cli/SKILL.md. Проверь localhost:8501
на ширинах 390 и 1440 px, сохрани скриншоты и перечисли реальные ошибки».

## Обновление

Не обновляйте набор автоматически перед демонстрацией. Сначала проверьте новые версии.
Файлы upstream сохранены без изменений. Локальные пояснения находятся в AGENTS.md
и этой инструкции. Бинарные файлы браузера и node_modules не коммитятся.
