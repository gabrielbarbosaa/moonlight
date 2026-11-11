import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const sharp = require('sharp');
const { pageSchema } = require('@moonlight/schemas');

if (process.env.NODE_ENV === 'production') {
  console.error('Este seed é só para desenvolvimento.');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(here, '..');
const mediaDir = resolve(apiRoot, process.env.MEDIA_DIR ?? 'storage/media');
const apiUrl = (process.env.API_URL ?? `http://localhost:${process.env.API_PORT ?? 4000}`).replace(
  /\/$/,
  '',
);
const webUrl = (process.env.WEB_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const EMAIL = 'moonbarber@example.com';
const PASSWORD = 'MoonBarber!2026';
const SLUG = 'moonbarber';
const NAME = 'MoonBarber';

const prisma = new PrismaClient();

async function removePrevious() {
  const user = await prisma.user.findUnique({
    where: { email: EMAIL },
    include: { mediaAssets: true },
  });
  if (!user) return;
  for (const asset of user.mediaAssets) {
    await rm(join(mediaDir, asset.key), { force: true });
  }
  await prisma.user.delete({ where: { id: user.id } });
}

async function storeImage(ownerId, fileName) {
  const input = await readFile(join(here, 'moonbarber', fileName));
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const id = randomUUID();
  const key = `${id}.webp`;
  await writeFile(join(mediaDir, key), data);
  await prisma.mediaAsset.create({
    data: {
      id,
      ownerId,
      key,
      contentType: 'image/webp',
      sizeBytes: data.length,
      width: info.width,
      height: info.height,
    },
  });
  return `${apiUrl}/media/files/${key}`;
}

function buildPage(img, agendaUrl) {
  const service = (id, label, description) => ({ id, label, url: agendaUrl, description });

  return {
    schemaVersion: 1,
    theme: {
      primaryColor: '#a78bfa',
      background: '#0f172a',
      backgroundType: 'solid',
      font: 'modern',
      buttonStyle: 'solid',
      buttonShape: 'rounded',
      radius: 'medium',
      spacing: 'comfortable',
      width: 'medium',
    },
    blocks: [
      { id: 'mb-header', type: 'header', variant: 'centered', props: { title: NAME } },
      {
        id: 'mb-hero',
        type: 'hero',
        variant: 'full-bleed',
        props: {
          heading: 'Corte, barba e atitude',
          subheading:
            'Barbearia clássica no coração da cidade. Hora marcada, sem fila e café por nossa conta.',
          imageUrl: img[0],
          ctaLabel: 'Agendar meu horário',
          ctaUrl: agendaUrl,
        },
      },
      {
        id: 'mb-social',
        type: 'social',
        variant: 'filled',
        props: {
          colorMode: 'brand',
          items: [
            { id: 'mb-s1', network: 'instagram', url: 'https://example.com/moonbarber/instagram' },
            { id: 'mb-s2', network: 'whatsapp', url: 'https://wa.me/5511999999999' },
            { id: 'mb-s3', network: 'facebook', url: 'https://example.com/moonbarber/facebook' },
            { id: 'mb-s4', network: 'tiktok', url: 'https://example.com/moonbarber/tiktok' },
            { id: 'mb-s5', network: 'youtube', url: 'https://example.com/moonbarber/youtube' },
            { id: 'mb-s6', network: 'email', url: 'mailto:contato@moonbarber.example' },
          ],
        },
      },
      {
        id: 'mb-about',
        type: 'text',
        variant: 'lead',
        props: {
          content:
            'A MoonBarber nasceu para devolver à barbearia o seu ritual: toalha quente, navalha afiada, boa conversa e um corte que dura até a próxima visita.',
        },
      },
      {
        id: 'mb-carousel',
        type: 'carousel',
        variant: 'cards',
        props: {
          title: 'Nosso espaço',
          items: [
            { id: 'mb-c1', imageUrl: img[0], caption: 'Corte à tesoura, sem pressa' },
            { id: 'mb-c2', imageUrl: img[1], caption: 'Cada fio no seu lugar' },
            { id: 'mb-c3', imageUrl: img[2], caption: 'Tradição de balcão e navalha' },
            { id: 'mb-c4', imageUrl: img[3], caption: 'Ferramentas de quem leva a sério' },
          ],
        },
      },
      {
        id: 'mb-services',
        type: 'linklist',
        variant: 'cards',
        props: {
          title: 'Serviços e preços',
          items: [
            service('mb-v1', 'Corte clássico', '45 min · R$ 60'),
            service('mb-v2', 'Barba com toalha quente', '30 min · R$ 45'),
            service('mb-v3', 'Corte + barba', '1h15 · R$ 95'),
            service('mb-v4', 'Sobrancelha na navalha', '15 min · R$ 20'),
          ],
        },
      },
      { id: 'mb-div1', type: 'divider', variant: 'dots', props: {} },
      {
        id: 'mb-gallery',
        type: 'gallery',
        variant: 'featured',
        props: {
          title: 'Bastidores',
          items: [
            { id: 'mb-g1', imageUrl: img[1], caption: 'Barbeiro de chapéu aparando as pontas' },
            { id: 'mb-g2', imageUrl: img[4], caption: 'Máquinas, tesouras e pentes organizados' },
            { id: 'mb-g3', imageUrl: img[3], caption: 'Coldre com tesouras profissionais' },
            { id: 'mb-g4', imageUrl: img[2], caption: 'Placa de madeira da barbearia' },
            { id: 'mb-g5', imageUrl: img[0], caption: 'Corte em andamento na cadeira' },
          ],
        },
      },
      {
        id: 'mb-quote',
        type: 'text',
        variant: 'quote',
        props: { content: 'Cabelo bom a gente resolve. A atitude, você já traz.' },
      },
      {
        id: 'mb-faq',
        type: 'faq',
        variant: 'accordion',
        props: {
          title: 'Perguntas frequentes',
          items: [
            {
              id: 'mb-q1',
              question: 'Preciso agendar?',
              answer:
                'Recomendamos. Reservando pelo site você garante o horário e não pega fila. Se sobrar vaga, atendemos também por ordem de chegada.',
            },
            {
              id: 'mb-q2',
              question: 'Quais as formas de pagamento?',
              answer:
                'Pix, cartão de débito e crédito, e dinheiro. O pagamento é feito no balcão, ao final do atendimento.',
            },
            {
              id: 'mb-q3',
              question: 'Posso cancelar ou remarcar?',
              answer:
                'Pode. Avise com pelo menos 2 horas de antecedência pelo e-mail da confirmação ou pelo WhatsApp.',
            },
            {
              id: 'mb-q4',
              question: 'Vocês atendem crianças?',
              answer:
                'Sim, a partir de 5 anos, com o mesmo cuidado. Escolha o corte clássico na hora de agendar.',
            },
          ],
        },
      },
      {
        id: 'mb-cta',
        type: 'hero',
        variant: 'card',
        props: {
          heading: 'Pronto para o próximo corte?',
          subheading: 'Escolha o serviço, o dia e o horário. A confirmação chega no seu e-mail.',
          ctaLabel: 'Reservar agora',
          ctaUrl: agendaUrl,
        },
      },
      {
        id: 'mb-where',
        type: 'text',
        variant: 'callout',
        props: {
          content:
            'Rua das Navalhas, 123 · Centro\nSegunda a sábado, das 9h às 19h (almoço das 12h às 13h)',
        },
      },
      {
        id: 'mb-footer',
        type: 'footer',
        variant: 'band',
        props: { text: '© 2026 MoonBarber · Feito com Moonlight' },
      },
    ],
  };
}

const force = process.argv.includes('--force');

async function isIntact() {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: SLUG },
    include: { page: true, owner: { include: { mediaAssets: true } } },
  });
  if (!tenant) return false;
  if (tenant.owner.email !== EMAIL) {
    throw new Error(`O endereço "${SLUG}" já pertence a outra conta (${tenant.owner.email}).`);
  }
  const assets = tenant.owner.mediaAssets;
  if (!tenant.page?.published || assets.length < 5) return false;
  return assets.every((asset) => existsSync(join(mediaDir, asset.key)));
}

async function main() {
  await mkdir(mediaDir, { recursive: true });

  if (!force && (await isIntact())) {
    console.log(`MoonBarber já está no banco: ${webUrl}/s/${SLUG} (use --force para recriar)`);
    return;
  }

  await removePrevious();

  const passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
  const user = await prisma.user.create({
    data: { email: EMAIL, passwordHash, emailVerified: true },
  });

  await prisma.subscription.create({
    data: {
      userId: user.id,
      plan: 'PRO',
      status: 'ACTIVE',
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 3600 * 1000),
    },
  });

  const img = [];
  for (const file of ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg']) {
    img.push(await storeImage(user.id, file));
  }

  const agendaUrl = `${webUrl}/s/${SLUG}/agenda`;
  const page = pageSchema.parse(buildPage(img, agendaUrl));

  const tenant = await prisma.tenant.create({
    data: {
      slug: SLUG,
      name: NAME,
      ownerId: user.id,
      bookingEnabled: true,
      timezone: 'America/Sao_Paulo',
    },
  });

  const created = await prisma.page.create({
    data: {
      tenantId: tenant.id,
      draft: page,
      published: page,
      schemaVersion: page.schemaVersion,
      publishedAt: new Date(),
    },
  });
  await prisma.pageVersion.create({
    data: { pageId: created.id, content: page, schemaVersion: page.schemaVersion },
  });

  await prisma.bookingService.createMany({
    data: [
      { tenantId: tenant.id, name: 'Corte clássico', durationMinutes: 45 },
      { tenantId: tenant.id, name: 'Barba com toalha quente', durationMinutes: 30 },
      { tenantId: tenant.id, name: 'Corte + barba', durationMinutes: 75 },
      { tenantId: tenant.id, name: 'Sobrancelha na navalha', durationMinutes: 15 },
    ],
  });

  const rules = [];
  for (let weekday = 1; weekday <= 6; weekday++) {
    rules.push({ tenantId: tenant.id, weekday, startMinute: 9 * 60, endMinute: 12 * 60 });
    rules.push({ tenantId: tenant.id, weekday, startMinute: 13 * 60, endMinute: 19 * 60 });
  }
  await prisma.availabilityRule.createMany({ data: rules });

  console.log(`MoonBarber pronto: ${webUrl}/s/${SLUG}`);
  console.log(`Agenda pública: ${agendaUrl}`);
  console.log(`Conta do dono: ${EMAIL} / ${PASSWORD} (o código de 2FA chega no Mailpit)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
