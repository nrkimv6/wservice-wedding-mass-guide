-- Add announcements column to mass_configurations table

alter table mass_configurations
add column if not exists announcements jsonb default '[]'::jsonb;

-- Add comment
comment on column mass_configurations.announcements is 'Array of announcement objects: [{ id, message, order }]';
