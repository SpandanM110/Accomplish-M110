# Accomplish UI/UX Checklist — Minutely Detailed

A comprehensive checklist for UI, UX, and interaction polish. Each item should be verified and fixed where needed.

---

## 1. Home Page

### TaskInputBar

- [ ] **Placeholder**: "Describe a task and let AI handle the rest" — clear and actionable
- [ ] **Empty submit**: Tooltip shows "Enter message" when empty
- [ ] **Over limit**: Tooltip shows "Message too long" when over `PROMPT_DEFAULT_MAX_LENGTH`
- [ ] **Loading state**: Submit button shows Loader2 spinner, input disabled
- [ ] **Speech recording**: Input disabled, mic shows recording state
- [ ] **Skill select**: Prepends command + space, focuses textarea after
- [ ] **Auto-resize**: Textarea grows up to 200px, no overflow

### Plus Menu

- [ ] **Attach Files**: Shows "Soon", disabled — consider removing or enabling
- [ ] **Skills search**: Filters by name, description, command
- [ ] **Empty skills**: "No skills found" centered, muted
- [ ] **Skill click**: Prepends command; no submenu for Hackathon Buddy actions
- [ ] **Refresh**: Spinning icon during refresh
- [ ] **Manage**: Opens Settings → Skills tab

### Example Prompts

- [ ] **Toggle**: Chevron rotates, section expands/collapses
- [ ] **Card hover**: scale 1.03, border highlight
- [ ] **Card click**: Sets prompt in input (does not auto-submit)
- [ ] **Hackathon section**: Trophy icon, amber styling, 6 prompts
- [ ] **Hackathon click**: Prepends `/hackathon-buddy` + prompt text

### Settings Gate

- [ ] **No provider**: Opens Settings (Providers tab) on submit
- [ ] **API key saved**: Closes dialog, executes task if prompt exists

---

## 2. Execution Page

### Header

- [ ] **Back button**: Navigates to home or history
- [ ] **Prompt**: Truncated with ellipsis, full on hover
- [ ] **Status badge**: Correct color for queued/running/completed/failed/cancelled/interrupted
- [ ] **Running shimmer**: `animate-shimmer` on primary badge

### Messages Area

- [ ] **User messages**: Right-aligned, primary background, copy on hover
- [ ] **Assistant messages**: Left-aligned, markdown rendered, copy on hover
- [ ] **Tool messages**: Muted background, icon + label, hidden for bash/todowrite/complete_task
- [ ] **Streaming**: 120 chars/sec, smooth
- [ ] **Continue button**: Shows when interrupted or completed + waiting
- [ ] **Scroll to bottom**: Button appears when not at bottom

### Progress Indicators

- [ ] **"Doing..."**: Shown when running, no current tool, no startup stage
- [ ] **Startup stages**: "Loading agent...", "Connecting to {{model}}...", "Setting up environment..."
- [ ] **Tool-specific**: e.g. "Searching web", "Reading files"
- [ ] **Elapsed time**: Shows (Ns) for startup stages
- [ ] **Disappears**: When status → completed/failed/interrupted

### Input Area — Running

- [ ] **Placeholder**: "Agent is working..."
- [ ] **Disabled**: Cursor not-allowed
- [ ] **Stop button**: Red square, tooltip "Stop agent (Ctrl+C)"
- [ ] **Model indicator**: Read-only

### Input Area — Follow-up

- [ ] **Shown when**: Completed or interrupted + has session
- [ ] **Placeholder**: "Give new instructions..." (or context-specific)
- [ ] **Plus menu**: Same as Home, prepends to follow-up input
- [ ] **Auto-focus**: When canFollowUp becomes true

### Completion States

- [ ] **Completed + session**: Follow-up input, Continue button on last message
- [ ] **Completed, no session**: "Start New Task" button
- [ ] **Failed**: Error message in red alert, "Start New Task"
- [ ] **Interrupted**: Follow-up input if session exists

### Queued State

- [ ] **Full page**: "Waiting for another task", clock icon
- [ ] **Inline**: "Your follow-up will continue automatically"

---

## 3. Hackathon Buddy Specific

### Direct Bypass (Search)

- [ ] **Trigger**: `/hackathon-buddy` + search/find, or "hackathon search/find"
- [ ] **Progress**: "Searching hackathons..." (not generic "Doing...")
- [ ] **Result**: Markdown list with links, prize, deadline
- [ ] **Completion**: Status → completed, "Doing..." disappears
- [ ] **0 results**: "Hackathons (0 total)" + tip about EXA_API_KEY

### Empty Results

- [ ] **Message**: Friendly "No hackathons found" + actionable tip
- [ ] **Tip visibility**: EXA_API_KEY, BRAVE_API_KEY, SERPER_API_KEY mentioned

### Tool Results Display

- [ ] **Search**: Markdown list, links clickable
- [ ] **Validate**: Score + feedback formatted
- [ ] **Ticket board**: Table or list
- [ ] **Judge dossiers**: Formatted profiles
- [ ] **README**: Full markdown, copyable

### Copy / Export

- [ ] **Per message**: Copy button on hover (exists?)
- [ ] **Full conversation**: Export as markdown (missing?)

---

## 4. Settings

### Providers Tab

- [ ] **Connected**: Green indicator, model name
- [ ] **Disconnected**: Grey, "Connect" CTA
- [ ] **API key**: Secure input, hints for each provider
- [ ] **Save**: Validates before save

### Skills Tab

- [ ] **Filter**: All / Active / Inactive / By Accomplish
- [ ] **Search**: Filters skills
- [ ] **Hackathon Buddy**: Official badge, toggle, description
- [ ] **Scroll**: "Scroll for more" when >4 skills

### EXA_API_KEY

- [ ] **Documentation**: Mentioned in skill, README
- [ ] **.env**: apps/desktop/.env
- [ ] **Error**: Clear message when search fails due to missing key

---

## 5. Permission Dialog

- [ ] **File ops**: Paths, operation type, preview
- [ ] **Question**: Options, custom textarea
- [ ] **Allow/Deny**: Clear buttons
- [ ] **Submit disabled**: When required fields empty

---

## 6. Accessibility & Polish

- [ ] **Focus indicators**: Visible focus ring on interactive elements
- [ ] **Keyboard nav**: Tab order logical
- [ ] **Screen reader**: Labels on buttons, status announcements
- [ ] **Color contrast**: Status badges readable

---

## 7. Known Gaps (Fixed)

| #   | Issue                                | Status                                      |
| --- | ------------------------------------ | ------------------------------------------- |
| 1   | "Doing..." stuck after direct bypass | ✅ Fixed — handler returns status completed |
| 2   | No retry on failed task              | ✅ Fixed — Retry button added               |
| 3   | Hackathon Buddy submenu              | ✅ Fixed — Submenu with 6 quick actions     |
| 4   | Placeholder "Agent is working..."    | ✅ Fixed — "you can stop anytime" added     |
| 5   | Copy/export for full conversation    | ✅ Fixed — Export conversation button       |
| 6   | 0 results empty state                | ✅ Fixed — Friendlier tip with .env path    |
| 7   | Loading skeleton                     | ✅ Fixed — Skeleton replaces spinner        |
| 8   | Keyboard shortcut hint               | ✅ Fixed — "Press ⌘K" below card            |

---

## Implementation Order

1. **ux1** — Fix "Doing..." stuck (verify complete flow)
2. **ux2** — Retry button on failed tasks
3. **ux3** — Hackathon Buddy submenu in Plus Menu
4. **ux5** — Copy/export for messages
5. **ux4** — Improve running placeholder
6. **ux6** — Friendlier empty state for 0 hackathons
7. **ux7** — Loading skeleton
8. **ux8** — Keyboard shortcut hint
