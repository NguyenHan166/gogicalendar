---
name: restaurant-schedule-product
description: Use this skill when designing or implementing a restaurant staff scheduling web app with employee availability registration, manager scheduling, weekly roster publishing, staffing forecast limits, and responsive mobile UI.
---

# Restaurant Schedule Product Skill

## Product Context

This project is a responsive restaurant staff scheduling web app.

There are two main user groups:

1. Employees
- Register weekly availability / preferred working shifts.
- View next week's finalized schedule.
- Use mostly on mobile.
- Need fast, simple, low-friction UI.

2. Managers
- View all employee availability.
- Lock the availability registration window.
- Build weekly schedules by shift.
- Compare assigned staff against chain-provided staffing forecast.
- View employee information.
- Use both desktop and mobile, but scheduling is desktop-first.

## UX Priorities

- Do not copy Excel visually, but keep the mental model familiar.
- Weekly calendar grid is the core interface.
- Manager scheduling view must show: day, shift, required/forecast staff, assigned staff, warnings if over/under forecast.
- Employee view must be extremely simple: choose week, choose available shifts, submit.
- Use clear status labels: Draft, Registration Open, Registration Locked, Published.
- Avoid generic SaaS dashboards.
- Avoid fake placeholder charts unless real data exists.
- Prefer dense but readable UI for manager screens.
- Prefer large tap targets and bottom actions for employee mobile screens.

## Design Direction

Use a modern operations-dashboard look:
- Clean table/calendar grid.
- Strong hierarchy.
- Soft surfaces.
- Clear color-coded shift states.
- Minimal animation.
- No excessive gradients.
- No random decorative blobs.
- No "AI-generated landing page" style.

## Implementation Rules

- Keep scheduling logic separated from UI components.
- Create reusable components for WeekSelector, ShiftCell, EmployeeAvailabilityCard, StaffingForecastBadge, ScheduleStatusPill.
- Validate manager actions: cannot publish before registration is locked.
- Show warnings when assigned staff exceeds forecast.
- Always consider responsive layout.