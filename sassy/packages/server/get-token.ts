import { prisma } from './src/lib/prisma.js';

async function getToken() {
  const token = await prisma.verificationToken.findFirst({
    where: { type: 'EMAIL_VERIFICATION' }
  });
  
  if (token) {
    console.log(token.token);
  } else {
    console.log('No token found');
  }
  
  await prisma.$disconnect();
}

getToken();
