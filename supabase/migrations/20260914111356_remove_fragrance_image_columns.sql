-- Images are deferred: drop the image columns.
-- (The empty fragrance-images bucket was removed through the Storage API,
-- since direct deletes from storage tables are blocked.)
alter table public.fragrances
  drop column image_url,
  drop column image_last_attempt_at;
