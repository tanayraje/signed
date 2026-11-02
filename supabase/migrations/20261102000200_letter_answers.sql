-- Answers to questions a friend asked, carried in the reply: [{question, answer, letter_id}]
alter table public.letters add column if not exists answers jsonb check (answers is null or jsonb_typeof(answers) = 'array');
