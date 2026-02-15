const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSocialAccountsStructure() {
  try {
    console.log('='.repeat(80));
    console.log('SOCIAL ACCOUNTS STRUCTURE ANALYSIS');
    console.log('='.repeat(80));
    console.log();

    const brandId = 'cmlicb9n30000k1048ky19g3u'; // Prabisha Consulting

    // Get brand with all relationships
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        members: {
          include: {
            user: {
              include: {
                socialAccounts: {
                  include: {
                    socialAccount: true
                  }
                }
              }
            }
          }
        },
        socialAccounts: {
          include: {
            socialAccount: {
              include: {
                users: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log(`🏢 Brand: ${brand.name}`);
    console.log(`   ID: ${brand.id}\n`);

    console.log('👥 BRAND MEMBERS:');
    console.log('-'.repeat(80));
    brand.members.forEach(member => {
      console.log(`\n${member.user.name} (${member.user.email})`);
      console.log(`   Personal Social Accounts (${member.user.socialAccounts.length}):`);
      member.user.socialAccounts.forEach(usa => {
        console.log(`      - ${usa.socialAccount.platform}: @${usa.socialAccount.platformUsername}`);
      });
    });

    console.log('\n\n📱 BRAND-CONNECTED SOCIAL ACCOUNTS:');
    console.log('-'.repeat(80));
    if (brand.socialAccounts.length === 0) {
      console.log('   No social accounts connected to this brand');
    } else {
      brand.socialAccounts.forEach(bsa => {
        console.log(`\n${bsa.socialAccount.platform}: @${bsa.socialAccount.platformUsername}`);
        console.log(`   Connected by users:`);
        bsa.socialAccount.users.forEach(usa => {
          console.log(`      - ${usa.user.name} (${usa.user.email})`);
        });
      });
    }

    console.log('\n\n🔍 EXPLANATION:');
    console.log('-'.repeat(80));
    console.log(`
Current Structure:
1. Users connect their personal social accounts (UserSocialAccount)
2. Brands can be linked to social accounts (SocialAccountBrand)
3. When a user views a brand, they see:
   - Social accounts connected to the BRAND (SocialAccountBrand)
   - NOT their personal accounts (UserSocialAccount)

Issue:
- If Prakash sees his LinkedIn under "Prabisha Consulting", it means:
  * His LinkedIn is connected to the BRAND (via SocialAccountBrand)
  * NOT just to him personally

- If Aanchal sees her LinkedIn, it means:
  * Her LinkedIn is also connected to the BRAND
  * OR she's seeing her personal accounts (which shouldn't show)

Solution:
- Social accounts should be shared at BRAND level
- All brand members should see the SAME social accounts
- Personal accounts should not appear in brand view
    `);

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSocialAccountsStructure();
