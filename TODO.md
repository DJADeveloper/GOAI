# GOAI Development Roadmap & TODO List

This document outlines the planned features and implementation phases for the GOAI application.

## Phase 1: Strengthening the Core & Basic Enhancements

*Focus: Making the existing tracking more robust and insightful*

- [ ] **Habit Tracking Enhancement:**
    - [ ] Implement automatic Streak Counting (based on `progress_events`).
    - [ ] Add basic Habit Analytics (completion %, current/longest streak display on `HabitsPage` / `Dashboard`).
- [ ] **Task Management Enhancement:**
    - [ ] Define schema/structure for basic Task Dependencies.
    - [ ] Implement UI for marking/viewing Task Dependencies.
    - [ ] Refine Deadline/Reminder handling (e.g., basic browser notifications).
- [ ] **Dashboard/UI Refinement:**
    - [ ] Implement a basic Calendar View (`react-big-calendar` or similar).
    - [ ] Add visual Goal Progress Indicators (e.g., percentage based on completed milestones/tasks).
- [ ] **Brain Dump Improvement:**
    - [ ] Add manual tagging/categorization options.
- [ ] **User Settings Expansion:**
    - [ ] Add Time Zone preference setting.
    - [ ] Persist settings to the database (requires backend/Supabase table update).
- [ ] **General Refinement:**
    - [ ] Add button/modal to link existing Tasks to Goals from `GoalDetailPage`.
    - [ ] Ensure consistent error handling and user feedback.
    - [ ] Code cleanup and refactoring as needed.

## Phase 2: Introducing Foundational AI & Engagement

*Focus: Adding the first "smart" features and engagement loops*

- [ ] **Goal & Plan Builder - SMART Wizard:**
    - [ ] Create a guided, multi-step form for Goal creation encouraging SMART principles.
- [ ] **Brain Dump - Basic Auto-Categorization:**
    - [ ] Implement simple keyword/rule-based tagging/routing logic (possibly backend).
- [ ] **Gamification - Points & Badges:**
    - [ ] Design and implement schema for points/levels/badges.
    - [ ] Award points/badges for task completion, habit streaks, milestone achievement.
    - [ ] Display points/badges on Profile or Dashboard.
- [ ] **Analytics V2:**
    - [ ] Implement charts for habit completion over time.
    - [ ] Add goal progress visualization.

## Phase 3: Deepening AI Integration & Proactivity

*Focus: Core AI coaching and predictive features*

- [ ] **AI Coaching - NLP Chat Interface (Basic):**
    - [ ] Integrate a chat UI component.
    - [ ] Set up backend endpoint to interact with an LLM API (e.g., Gemini API).
    - [ ] Handle simple, predefined queries about user's data.
- [ ] **Personalized Nudges (Rule-Based):**
    - [ ] Define rules for nudges (e.g., upcoming deadline, slipping habit streak).
    - [ ] Implement backend logic/scheduled jobs for generating nudges.
    - [ ] Set up a basic notification system (e.g., in-app notifications).
- [ ] **Predictive Analytics (Simple Forecasts):**
    - [ ] Develop backend logic to calculate simple progress projections based on history.
    - [ ] Display basic forecasts/warnings in the UI.

## Phase 4: Expanding Connectivity & Social Features

*Focus: Integrating with external systems and users*

- [ ] **Integrations - Calendar Sync:**
    - [ ] Implement backend OAuth flow for Google Calendar/Outlook.
    - [ ] Implement API logic to push/pull tasks/milestones.
    - [ ] Add UI for managing calendar connection.
- [ ] **Smart Alerts:**
    - [ ] Enhance notification system (Email, potentially Push Notifications via service).
    - [ ] Allow user configuration of notification channels/preferences.
- [ ] **Social Features (Optional):**
    - [ ] Design schema for groups/challenges.
    - [ ] Implement UI for accountability circles or leaderboards.

## Phase 5: Advanced AI & Ecosystem Integration

*Focus: Highly sophisticated AI and broader connections*

- [ ] **Advanced AI Coaching:**
    - [ ] Improve NLP context understanding.
    - [ ] Enhance personalization and guidance quality.
- [ ] **Advanced Predictive Analytics:**
    - [ ] Implement more sophisticated prediction models.
    - [ ] Provide actionable corrective suggestions.
- [ ] **Device & App Hooks:**
    - [ ] Explore APIs for fitness trackers (e.g., Google Fit, Apple HealthKit) or other apps.
    - [ ] Integrate relevant external data.

---
*Note: This is a flexible roadmap. Priorities may shift based on development progress and user feedback.* 