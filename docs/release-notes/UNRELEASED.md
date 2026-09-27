## ✨ Highlights

### Madrat message renders Markdown

When nobody is editing it, the madrat message shows as formatted Markdown (headings, lists, links, tables, quotes, code) in the MADASH theme, in both light and dark mode. Click it to edit, click away to preview.

| Light                                                                                                                                            | Dark                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| ![Madrat message preview, light](https://raw.githubusercontent.com/System-B90/madash/{{TAG}}/docs/release-notes/assets/madrat-preview-light.png) | ![Madrat message preview, dark](https://raw.githubusercontent.com/System-B90/madash/{{TAG}}/docs/release-notes/assets/madrat-preview-dark.png) |

### Tag students, segel, checkers, rooms and groups with `@`

Type `@` while editing to open a picker grouped by kind (students, segel, checkers, rooms, groups). It opens right at the caret, with context under each option.

![@ mention picker](https://raw.githubusercontent.com/System-B90/madash/{{TAG}}/docs/release-notes/assets/mention-picker.png)

Tagged names are highlighted in their kind's colour and icon. Hover one for a card built for that kind:

| Student                                                                                                                         | Room                                                                                                                      | Group                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| ![Student card](https://raw.githubusercontent.com/System-B90/madash/{{TAG}}/docs/release-notes/assets/mention-card-student.png) | ![Room card](https://raw.githubusercontent.com/System-B90/madash/{{TAG}}/docs/release-notes/assets/mention-card-room.png) | ![Group card](https://raw.githubusercontent.com/System-B90/madash/{{TAG}}/docs/release-notes/assets/mention-card-group.png) |
| Live status, **every** room they're in, groups, mentor                                                                          | Headcount, attendance bar, segel in the room                                                                              | Attendance, and which rooms the group is spread across                                                                      |

| Segel                                                                                                                       | Checker                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| ![Segel card](https://raw.githubusercontent.com/System-B90/madash/{{TAG}}/docs/release-notes/assets/mention-card-segel.png) | ![Checker card](https://raw.githubusercontent.com/System-B90/madash/{{TAG}}/docs/release-notes/assets/mention-card-checker.png) |
| Status and mentees                                                                                                          | Status and checking brief                                                                                                       |

<sub>Screenshots use mock data. Regenerate them with `RELEASE_SCREENSHOTS=1 npx playwright test -c tests/playwright.config.ts tests/release-screenshots.spec.ts`.</sub>
