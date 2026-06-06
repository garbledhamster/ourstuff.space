# Ubiquitous Language

## Dashboard Literacy

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Project** | A Life container for phases, tasks, notes, status, assignments, and attachments. | Folder, initiative |
| **Phase** | A workflow step inside one **Project** that groups related tasks and attachments. | Stage, milestone |
| **Task** | A concrete action that can stand alone or belong to a **Project** phase. | Todo item, chore |
| **Snapshot** | The current visible reading of saved local data for a selected time range. | Report, export |
| **Attention** | A dashboard signal that shows where recent activity has been going. | Engagement, usage |
| **Warning** | A plain-language notice that something may block understanding or action. | Error, alert, issue |
| **Activity** | A dated event created from notes, saves, journal entries, tasks, or project work. | Event, log entry |
| **Tool** | A focused app surface that helps the user do one kind of work. | Feature, widget |
| **Skill** | A reusable agent workflow or capability outside the user's private app data. | Automation, plugin |
| **MCP** | Model Context Protocol, a connected tool interface for agents. | Integration, server |
| **Refresh** | A user action that asks the app or backend to fetch the newest safe state. | Reload, resync |
| **Teaching mode** | A local UI preference that reveals short explanations near dashboard surfaces. | Tutorial, onboarding |

## Relationships

- A **Project** has zero or more **Phases**.
- A **Phase** has zero or more **Tasks**.
- A **Task** can be standalone or linked to one **Project** phase.
- A **Snapshot** is read from existing local data and does not create new records.
- **Teaching mode** explains the current **Snapshot** without changing private data.

## Example Dialogue

> **Dev:** "The dashboard says Life has activity. Is that a project count?"
> **Domain expert:** "No. **Activity** is the event stream. A **Project** is one kind of Life work that can create activity."
> **Dev:** "So a warning should not just say `Needs attention`?"
> **Domain expert:** "Right. A **Warning** should say what is missing and what small action would make the snapshot clearer."
> **Dev:** "Teaching mode can explain that without changing the user's records?"
> **Domain expert:** "Yes. **Teaching mode** is a local reading layer over the existing snapshot."

## Flagged Ambiguities

- "Tool" can mean an in-app work surface or an external agent capability. In the app UI, use **Tool** for in-app surfaces and **Skill** for agent workflows.
- "API" is an acronym. In first-screen teaching copy, say "app connection" or expand it before using "API".
- "Attention" should describe recent activity distribution, not user virtue, focus quality, or self-worth.
