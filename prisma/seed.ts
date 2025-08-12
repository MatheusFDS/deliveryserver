// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log(`Iniciando o processo de seed...`);

  // 1. Criar Roles Essenciais
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'superadmin' },
    update: {
      description: 'Administrador Geral da Plataforma',
      isPlatformRole: true,
    },
    create: {
      name: 'superadmin',
      description: 'Administrador Geral da Plataforma',
      isPlatformRole: true,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: { description: 'Administrador do Tenant', isPlatformRole: false },
    create: {
      name: 'admin',
      description: 'Administrador do Tenant',
      isPlatformRole: false,
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: { description: 'Usuário Padrão do Tenant', isPlatformRole: false },
    create: {
      name: 'user',
      description: 'Usuário Padrão do Tenant',
      isPlatformRole: false,
    },
  });

  const driverRole = await prisma.role.upsert({
    where: { name: 'driver' },
    update: { description: 'Motorista do Tenant', isPlatformRole: false },
    create: {
      name: 'driver',
      description: 'Motorista do Tenant',
      isPlatformRole: false,
    },
  });

  console.log(
    'Roles criadas/atualizadas:',
    superAdminRole,
    adminRole,
    userRole,
    driverRole,
  );

  // 2. Criar o Usuário Super Admin a partir do .env
  const saEmail = process.env.PLATFORM_ADMIN_EMAIL;
  const saPassword = process.env.PLATFORM_ADMIN_PASSWORD;
  const saName = process.env.PLATFORM_ADMIN_NAME;

  if (!saEmail || !saPassword || !saName) {
    console.error(
      'Variáveis de ambiente PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD ou PLATFORM_ADMIN_NAME não definidas no .env',
    );
    process.exit(1);
  }

  let superAdminUser = await prisma.user.findUnique({
    where: { email: saEmail },
  });

  if (!superAdminUser) {
    const hashedPassword = await bcrypt.hash(saPassword, 10);
    superAdminUser = await prisma.user.create({
      data: {
        email: saEmail,
        password: hashedPassword,
        name: saName,
        roleId: superAdminRole.id,
        tenantId: null,
        isActive: true,
      },
    });
    console.log('Usuário Super Admin criado:', superAdminUser);
  } else {
    console.log('Usuário Super Admin já existe:', superAdminUser.email);
  }

  // 3. Criar convite para o Super Admin (se não existir)
  const existingInvite = await prisma.userInvite.findFirst({
    where: {
      email: saEmail,
      tenantId: null,
    },
  });

  if (!existingInvite) {
    const invite = await prisma.userInvite.create({
      data: {
        email: saEmail,
        tenantId: null,
        roleId: superAdminRole.id,
        status: 'PENDING',
        expiresAt: new Date(
          new Date().setFullYear(new Date().getFullYear() + 1),
        ), // 1 ano de validade
        invitedBy: 'system', // ou id válido de usuário que criou o convite
      },
    });
    console.log('Convite para Super Admin criado:', invite);
  } else {
    console.log('Convite para Super Admin já existe:', existingInvite.id);
  }

  console.log(`Seed finalizado.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
