# Reusable components (implemented)

| Component | File | Purpose |
|---|---|---|
| Motion layer | `src/lib/motion/index.ts` | Registers GSAP + ScrollTrigger once, `useGSAP`, `prefersReducedMotion`, motion tokens |
| `ScrollReveals` | `src/components/ui/ScrollReveals.tsx` | Global driver for `[data-reveal]` entrances (progressive enhancement) |
| `SmoothScroll` | `src/components/ui/SmoothScroll.tsx` | Lenis inertial scrolling synced to the GSAP ticker |
| `Reveal`, `SplitText`, `Parallax`, `Counter`, `Magnetic`, `TiltCard`, `ScrollProgress` | `src/components/ui/motion-primitives.tsx` | Component-level motion primitives |
| `Glass`, `Button`, `SectionHeader`, `Pill`, `StatTile` | `src/components/ui/index.tsx` | Surface, button and heading primitives |
| `cn`, `shell`, `field`, `label`, `buttonVariants` | `src/components/ui/styles.ts` | Shared class recipes |
| `HeroSection` | `src/components/site1/HeroSection.tsx` | Cinematic pinned hero with real instructor stats |
| `FeatureStrip`, `ImpactPanel`, `LearningPaths`, `SkillsStory`, `Eyebrow` | `src/components/site1/LandingStory.tsx` | Landing storytelling sections |
| `ScrollVideoStory` | `src/components/site1/ScrollVideoStory.tsx` | Pinned chapter whose video is scrubbed by scroll, with timed copy scenes |
| `StoryNextLevel`, `StoryFluency` | `src/components/site1/StoryChapters.tsx` | The two brand-film chapters |
| `Site1Home` | `src/components/site1/Site1Home.tsx` | Landing composition following Site Builder visibility/order |
| `Header` | `src/components/common/Header.tsx` | Fixed glass pill nav (landing) / sticky (app), scroll-aware active item |
| `EduLevelLogo` | `src/components/common/EduLevelLogo.tsx` | Brand mark |
| `LessonVideo` | `src/components/common/LessonVideo.tsx` | Native/YouTube lesson player with resume, progress saving, subtitles, empty and error states |
| `AuthPage` | `src/components/auth/AuthPage.tsx` | Login, registration wizard, Google sign-in, owner access |
| `Site2LMS` + views | `src/components/site2/*` | Student cabinet shell and its 25+ views |
| `Site3Owner` + managers | `src/components/site3/*` | Owner/admin panel and its 20 managers |
| Student analytics | `src/lib/studentAnalytics.ts` | Real per-student progress, skills, daily activity |
| Auth library | `src/lib/auth/{password,session,guards,rateLimit,firebaseToken}.ts` | Hashing, sessions, role guards, rate limits, Google token verification |
| Video helpers | `src/lib/video.ts` | Placeholder detection, YouTube embed URLs |
| Exam scoring | `src/lib/exam/scoring.ts` | Server-side scoring, answer normalization, accepted alternatives, conversions only for defined test lengths |
| `useExamSession` | `src/lib/exam/useExamSession.ts` | Server exam session hook: start/resume, server-synced timer, autosave, idempotent submit, review |
| `MockExamPlayer`, `ReadingSimulator`, `ListeningSimulator` | `src/components/site2/*` | Exam interfaces using `useExamSession` |
| `TestimonialsMarquee` | `src/components/site1/TestimonialsMarquee.tsx` | Two-row horizontal opinions strip (approved reviews + published results) |
| `ReviewsManager`, `FaqManager`, `OwnerSecurityManager` | `src/components/site3/*` | Review moderation, FAQ editor, owner login/password |
| `SmartTranslatorFlashcards` | `src/components/site2/SmartTranslatorFlashcards.tsx` | Translator + server SM-2 flashcards (edit/delete) + vocabulary blitz |
| `AIEnglishStudio` | `src/components/site2/AIEnglishStudio.tsx` | AI tutor with server-persisted chat threads |
| `ExamShell` | `src/components/site2/ExamShell.tsx` | Full-screen exam frame: candidate bar, server timer + warnings, autosave state, text size, footer navigator |
| `BodyPortal` | `src/components/common/BodyPortal.tsx` | Renders full-screen layers into `document.body` (escapes stacking contexts) |
| `ProgressView` | `src/components/site2/ProgressView.tsx` | Single student progress page (replaces Progress insight + O‘quv dinamikasi) |
