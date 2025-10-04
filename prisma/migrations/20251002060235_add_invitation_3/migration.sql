-- Create the new unique constraint if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS `BrandInvitation_brandId_invitedToId_status_key` 
ON `BrandInvitation`(`brandId`, `invitedToId`, `status`);

-- Create the new index if it doesn't exist
CREATE INDEX IF NOT EXISTS `BrandInvitation_invitedById_invitedToId_status_idx` 
ON `BrandInvitation`(`invitedById`, `invitedToId`, `status`);

-- Drop the old unique constraint if it exists
DROP INDEX IF EXISTS `BrandInvitation_brandId_email_status_key` ON `BrandInvitation`;

-- Drop the old index if it exists
DROP INDEX IF EXISTS `BrandInvitation_email_status_idx` ON `BrandInvitation`;