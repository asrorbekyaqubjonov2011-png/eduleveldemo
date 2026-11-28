-- Synthetic Listening content for the disposable integration database.
insert into public.content_items (kind, id, data)
select 'listening_test', 'vision-listening-' || track,
  jsonb_build_object(
    'id', 'vision-listening-' || track,
    'title', 'Vision Listening fixture ' || track,
    'track', track,
    'durationMinutes', 5,
    'sections', jsonb_build_array(jsonb_build_object(
      'id', 'vision-listening-section', 'sectionNumber', 1, 'title', 'School directions',
      'audioUrl', '', 'transcript', 'Meet me next to the school library.',
      'questions', jsonb_build_array(jsonb_build_object(
        'id', 'vision-listening-question', 'questionNumber', 1,
        'prompt', 'Where is the meeting?', 'options', jsonb_build_array('School library', 'Train station'),
        'correctAnswerIndex', 0, 'explanation', 'The speaker says school library.'
      ))
    ))
  )
from (values ('ielts'), ('cefr')) as fixtures(track)
on conflict (kind, id) do nothing;
