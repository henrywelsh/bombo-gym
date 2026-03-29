# Bombo Gym — Testing Guide

This guide walks through every feature of the app to verify it's working correctly. Follow the sections in order on a fresh login.

---

## 1. Authentication

### Google OAuth Sign-In
1. Open the app (`npm run dev` → `http://localhost:5173`)
2. Verify the login screen shows with the Bombo Gym title and Google sign-in button
3. Click **Sign in with Google** — you should be redirected to Google's OAuth page
4. Complete sign-in — you should be redirected back to the app

**Expected:** App redirects you to `/settings` (first-time user — no `program_start_date` set yet)

**Verify in Supabase:**
- Dashboard → Authentication → Users — your Google account should appear
- Dashboard → Table Editor → `profiles` — a row with your user ID should exist (created by the trigger), with all fields NULL except `id` and `created_at`

### First-Login Redirect
1. While logged in with no `program_start_date` set, manually navigate to `/` or `/progress`

**Expected:** App redirects back to `/settings` every time until the profile is configured

### Sign Out
1. Go to Settings → click **Sign out**

**Expected:** App returns to the login screen. Navigating to any route while logged out should show the login screen, never app content.

---

## 2. Settings Page

### Profile Setup
1. Sign in and land on `/settings`
2. Fill in:
   - **Program Start Date:** pick any past or future date (try today's date first)
   - **Height:** `75` (6'3" = 75 inches)
   - **Current Weight:** `180`
   - **Target Weight:** `200`
3. Click **Save Profile**

**Expected:** "Saved!" confirmation appears. You can now navigate to other pages freely.

**Verify in Supabase:** `profiles` table row should now have all four fields populated.

### Program Month Calculation
Change the start date and observe the Dashboard header:
- Start date = today → Month **0**
- Start date = 3 months ago → Month **3**
- Start date = 6 months ago → Month **6**
- Start date = 13+ months ago → Month **12** (clamped)

### Supplements — Import Defaults
1. Click **Import defaults from program**

**Expected:** Three rows appear: Creatine Monohydrate (5g, Daily), Fish Oil (2–3g, Daily), Vitamin D (2,000 IU, Daily if low sunlight)

**Verify in Supabase:** `user_supplements` table should have 3 rows for your user ID.

### Supplements — Add / Edit / Delete
1. Click **+ Add** → fill in a custom supplement → Save
2. Click **Edit** on an existing supplement → change the dose → Save
3. Click **×** on a supplement

**Expected:** List updates immediately each time. Deletions mark `active = false` in the DB (soft delete) — the row stays in `user_supplements` but disappears from the UI.

---

## 3. Dashboard

### Today's Workout View
1. Navigate to **Today** (home icon)
2. Verify the header shows today's date and current program month

**If today is Monday–Friday:**
- A split label should appear (e.g. "Upper Pull + Core" on Monday)
- The correct exercises for that day should be listed (verify against the weekly split below)
- Daily staples (Swings, Halos, Prying Goblet Squat) should appear — either inside the split or below it as a separate section

**Weekly split to verify against:**
| Day | Split | Exercises |
|---|---|---|
| Mon | Upper Pull + Core | Pull-ups, Halos, TGUs |
| Tue | Lower Body + Conditioning | Prying Goblet Squat, Single-leg Deadlift, Swings |
| Wed | Upper Push + Core | Halos, TGUs, Swings |
| Thu | Lower Body + Conditioning | Prying Goblet Squat, Single-leg Deadlift, Swings |
| Fri | Full-body Power + Pull | Swings, Pull-ups, TGUs, Single-leg Deadlift |

**If today is Saturday or Sunday:**
- Rest day notice should appear with a 🏖️ icon

### Exercise Target Cards
Each exercise card should show:
- **Current target** — weight × sets × reps for the current program month
- **Next milestone** — the next milestone to aim for

**Verify targets at Month 0 (start date = today):**
| Exercise | Current Target |
|---|---|
| Swings | 53 lb · 10×10 |
| Prying Goblet Squat | 35 lb · 3×8 |
| Halos | 35 lb · 3×10 |
| Pull-ups | 0×0 (not yet) |
| TGUs | 35 lb · 3×5 |
| Single-leg Deadlift | 35 lb · 3×8 |

**Verify targets at Month 3 (start date = 3 months ago):**
| Exercise | Current Target |
|---|---|
| Swings | 70 lb · 8×12 |
| Prying Goblet Squat | 53 lb · 3×10 |
| Halos | 44 lb · 3×12 |
| Pull-ups | 3×5 |
| TGUs | 44 lb · 3×6 |
| Single-leg Deadlift | 44 lb · 3×10 |

### Logged Today Indicator
After logging a session for today (see Section 4), return to Dashboard.

**Expected:** Each exercise you logged shows a green dot with "Logged: X lb · Y×Z"

---

## 4. Log Session

### Logging a New Session
1. Navigate to **Log**
2. Verify the date defaults to today
3. Click exercise buttons to add exercises to the session — each should pre-fill with current milestone targets
4. Modify a weight/sets/reps value
5. Add a note to one exercise
6. Click **Save Session**

**Expected:** "Saved!" confirmation appears

**Verify in Supabase:** `exercise_logs` table should have a row per exercise with your user ID, today's date, and the values you entered.

### Loading Existing Logs
1. Stay on the Log page and change the date picker to today (or a date you just logged)

**Expected:** Previously saved values reload into the form automatically

### Date Picker — Backdating
1. Change the date to a past date
2. Add an exercise and save

**Expected:** Saves successfully. Check `exercise_logs` in Supabase — the `logged_date` should match the date you picked, not today.

### Upsert Behavior (editing a log)
1. Log exercises for today
2. Change a weight value and save again for the same date

**Expected:** No duplicate rows in `exercise_logs` — the existing row is updated (upsert on `user_id, logged_date, exercise_id`)

---

## 5. Progress

### Exercise Strength Charts
1. Navigate to **Progress**
2. Log at least 2 sessions on different dates with increasing weights (use the Log page with different dates)
3. Return to Progress and select an exercise

**Expected:**
- Line chart appears showing logged max weight per date
- The progress bar at the top reflects your current program month
- Milestone table below the chart highlights months you've passed in amber

### Milestone Table
For any exercise at Month 3, the milestone table should show:
- Month 0: normal color
- Month 3: amber (current) with "← now" label
- Months 6, 9, 12: dimmed

### Body Weight Chart
1. Log at least one body measurement (Nutrition page → Body Measurements section)
2. Return to Progress

**Expected:** Body weight chart appears with a green dashed goal line at your target weight (200 lb)

### No Data State
Before logging anything, each chart should show a friendly empty state message, not an error.

---

## 6. Nutrition

### Supplement Checklist
1. Navigate to **Nutrition**
2. The supplements you added in Settings should appear as checkboxes

**Expected:** Unchecked by default each day

3. Click a checkbox to mark it complete

**Expected:** Checkbox turns amber, supplement name gets strikethrough

**Verify in Supabase:** `supplement_logs` table should have a row with `completed = true`

4. Uncheck it

**Expected:** Row in `supplement_logs` updates to `completed = false`

5. Reload the page

**Expected:** Checked state persists (loaded from DB)

### Meal Planner — Adding a Meal
1. Click any cell in the meal grid (e.g. Monday Breakfast)
2. Type a meal description: "4 eggs, oatmeal, whey shake"
3. Fill in macros: Calories 650, Protein 55, Carbs 60, Fat 18
4. Click **Save**

**Expected:** Cell updates with the description text. The day column header should now show a calorie total.

**Verify in Supabase:** `meal_plans` table should have a row for your user, the current week_start, day_of_week=0, meal_slot='breakfast'

### Meal Planner — Clearing a Meal
1. Click a filled cell → click **Clear**

**Expected:** Cell returns to empty state (+). Row removed from `meal_plans`.

### Week Navigation
1. Click **›** to advance to next week
2. Add a meal on the new week

**Expected:** Previous week's meals are gone; new week is blank. Click **‹** to go back — previous week's data reloads.

**Verify in Supabase:** Two rows in `meal_plans` with different `week_start` dates.

### Meal Templates
1. Click **+ Template**
2. Fill in: Name "Standard Breakfast", Description "4 eggs, oatmeal, whey shake", Calories 650, Protein 55
3. Save

**Expected:** Template appears in the template list

4. Click a meal cell → select "Standard Breakfast" from the template dropdown

**Expected:** Description and macro fields auto-fill from the template

5. Click **×** next to a template to delete it

**Expected:** Template removed from list; existing meal plan entries that referenced it are unaffected (meal_template_id becomes NULL)

### Body Measurements
1. Scroll to **Body Measurements**
2. Enter today's date, weight 180, muscle percentage 38
3. Click **Save Measurement**

**Expected:** Stats appear above: Weight 180 lb, Muscle % 38%, BMI (calculated from your height — for 6'3"/75 inches and 180 lb, BMI ≈ 22.5)

4. Log a second measurement on a different date

**Expected:** History table shows both entries (newest first). Go to Progress → Body Weight chart should now show a line.

---

## 7. Data Isolation (RLS)

This verifies that users cannot see each other's data.

1. Sign in as User A, log a session
2. Sign out, sign in as User B (different Google account)
3. Navigate to Progress

**Expected:** User B sees no logs, no measurements — a completely fresh state

**Verify in Supabase:** In Table Editor → `exercise_logs`, filter by each user ID — rows should only appear for the correct user.

---

## 8. Shared Lookup Data

Verify the seed data is available to all users.

**In Supabase Table Editor:**
- `exercises` → should have 6 rows: Swings, Prying Goblet Squat, Halos, Pull-ups, TGUs, Single-leg Deadlift
- `exercise_milestones` → should have 30 rows (6 exercises × 5 milestone months) all with `user_id = NULL`
- `weekly_split_days` → 5 rows (Mon–Fri)
- `weekly_split_exercises` → 16 rows total
- `mobility_routines` → 16 rows across 4 phases

**After first login:**
- `exercise_milestones` → should now also have 30 rows with your `user_id` (copied from defaults)

---

## 9. Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Weekend visit | Dashboard shows rest day message, no split |
| No start date set | All pages redirect to Settings |
| Log page with no exercises added | Save button is disabled |
| Progress with no logs | Empty state messages, no errors |
| Meal planner on a week with no entries | All cells show + |
| Setting start date in the future | Program month = 0, Month 0 targets shown |
| Start date > 12 months ago | Program month clamped to 12, Month 12 targets shown |
