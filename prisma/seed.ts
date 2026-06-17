import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const types = [
    'Engenharia/TI',
    'Operações',
    'CRM de vendas',
    'Educação',
    'Marketing',
    'Recursos Humanos',
    'Pequena empresa',
    'Empresarial',
    'Outro'
  ];

  for (const type of types) {
    await prisma.workspaceType.upsert({
      where: { name: type },
      update: {},
      create: { name: type },
    });
  }

  // Cadastrar os Setores de Atividade solicitados
  const sectors = [
    { name: 'FOLLOW UP', acronym: 'FUP' },
    { name: 'SUPORTE', acronym: 'SUP' },
    { name: 'ENGENHARIA', acronym: 'ENG' },
    { name: 'CONTABILIDADE', acronym: 'CTB' },
    { name: 'FINANCEIRO', acronym: 'FNC' },
    { name: 'OBRA', acronym: 'OBR' },
    { name: 'QUALIDADE', acronym: 'QLD' },
    { name: 'RECURSOS HUMANOS', acronym: 'RH' },
    { name: 'COMERCIAL', acronym: 'COM' },
    { name: 'MANUTENCAO', acronym: 'MAN' },
    { name: 'JURIDICO', acronym: 'JUR' },
  ];

  for (const sector of sectors) {
    await prisma.sector.upsert({
      where: { name: sector.name },
      update: { acronym: sector.acronym },
      create: { name: sector.name, acronym: sector.acronym, active: true },
    });
  }

  // Criar um usuário mock
  await prisma.user.upsert({
    where: { email: 'vlpinto.eng@gmail.com' },
    update: {},
    create: {
      name: 'Victor Pinto',
      email: 'vlpinto.eng@gmail.com',
      image: 'https://github.com/victorpinto.png' // Avatar de exemplo
    }
  });

  console.log('Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
