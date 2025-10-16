-- Create the new unique constraint
CREATE UNIQUE INDEX `BrandInvitation_brandId_invitedToId_status_key` 
ON `BrandInvitation`(`brandId`, `invitedToId`, `status`);

-- Create the new index
CREATE INDEX `BrandInvitation_invitedById_invitedToId_status_idx` 
ON `BrandInvitation`(`invitedById`, `invitedToId`, `status`);

-- Drop the old unique constraint (if it exists, you need to drop manually before running migration)
DROP INDEX `BrandInvitation_brandId_email_status_key` ON `BrandInvitation`;

-- Drop the old index (if it exists, drop manually first)
DROP INDEX `BrandInvitation_email_status_idx` ON `BrandInvitation`;
