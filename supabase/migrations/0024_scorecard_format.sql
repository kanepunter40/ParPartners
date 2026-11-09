-- Scoring formats on scorecards. A card scores in its round's format unless someone on it picks
-- another (solo cards default to stroke play). The app works out Stableford points, match play
-- standings and best-ball team scores from the strokes; nothing else changes in the data.

alter table scorecards add column format text
  check (format in ('casual', 'strokeplay', 'stableford', 'match_play', 'best_ball', 'scramble'));
comment on column scorecards.format is 'null = the round''s format (stroke play for a solo card)';

create function set_scorecard_format(p_scorecard_id uuid, p_format text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_scorecard_member(p_scorecard_id) then raise exception 'Scorecard not found'; end if;
  update scorecards set format = p_format where id = p_scorecard_id;
end $$;
revoke execute on function set_scorecard_format(uuid, text) from public, anon;
grant execute on function set_scorecard_format(uuid, text) to authenticated;
