import { BlockPreview, PageRenderer } from '@moonlight/renderer';
import {
  ANIMATION_TYPES,
  DEFAULT_THEME,
  PLANS,
  SOCIAL_NETWORKS,
  THEME_PRESETS,
  blockSchema,
  samplePage,
  type Block,
  type Entitlements,
  type PageContent,
  type PlanDefinition,
  type Theme,
} from '@moonlight/schemas';
import Link from 'next/link';
import { Brand } from '@/components/brand';
import { Icon, type IconName } from '@/components/icons';
import { ThemeToggle } from '@/components/theme-toggle';

const preset = (id: string): Theme =>
  THEME_PRESETS.find((item) => item.id === id)?.theme ?? DEFAULT_THEME;

const centerPage: PageContent = {
  schemaVersion: 1,
  theme: preset('barbearia'),
  blocks: [
    { id: 'c-header', type: 'header', variant: 'centered', props: { title: 'MoonBarber' } },
    {
      id: 'c-hero',
      type: 'hero',
      variant: 'card',
      props: {
        heading: 'Corte, barba e atitude',
        subheading: 'Hora marcada, sem fila.',
        ctaLabel: 'Agendar horário',
        ctaUrl: 'https://example.com/agenda',
      },
    },
    {
      id: 'c-social',
      type: 'social',
      variant: 'filled',
      props: {
        colorMode: 'custom',
        color: '#d4a24c',
        items: [
          { id: 's1', network: 'instagram', url: 'https://example.com/1' },
          { id: 's2', network: 'whatsapp', url: 'https://example.com/2' },
          { id: 's3', network: 'tiktok', url: 'https://example.com/3' },
          { id: 's4', network: 'youtube', url: 'https://example.com/4' },
        ],
      },
    },
    {
      id: 'c-links',
      type: 'linklist',
      variant: 'cards',
      props: {
        title: 'Serviços',
        items: [
          {
            id: 'l1',
            label: 'Corte clássico',
            url: 'https://example.com/a',
            description: '45 min · R$ 60',
          },
          {
            id: 'l2',
            label: 'Barba com toalha quente',
            url: 'https://example.com/b',
            description: '30 min · R$ 45',
          },
        ],
      },
    },
  ],
};

const leftPage = samplePage(preset('lavanda'), 'Lia Santos');
const rightPage = samplePage(preset('aurora'), 'Studio Aurora');

const socialPreview: Block = {
  id: 'bento-social',
  type: 'social',
  variant: 'filled',
  props: {
    colorMode: 'brand',
    items: [
      { id: 'b1', network: 'instagram', url: 'https://example.com/1' },
      { id: 'b2', network: 'youtube', url: 'https://example.com/2' },
      { id: 'b3', network: 'whatsapp', url: 'https://example.com/3' },
      { id: 'b4', network: 'spotify', url: 'https://example.com/4' },
      { id: 'b5', network: 'discord', url: 'https://example.com/5' },
    ],
  },
};

const marqueeIds = [
  'oceano',
  'meia-noite',
  'papel',
  'neon',
  'barbearia',
  'lavanda',
  'vinho',
  'aurora',
  'retro',
  'menta',
];
const marquee = THEME_PRESETS.filter((item) => marqueeIds.includes(item.id));

const stats = [
  { value: blockSchema.options.length, label: 'tipos de bloco' },
  { value: THEME_PRESETS.length, label: 'temas prontos' },
  { value: SOCIAL_NETWORKS.length, label: 'redes e contatos' },
  { value: ANIMATION_TYPES.length - 1, label: 'animações ao rolar' },
];

const stackBlocks: { icon: IconName; label: string }[] = [
  { icon: 'heading', label: 'Cabeçalho' },
  { icon: 'sparkles', label: 'Destaque' },
  { icon: 'images', label: 'Carrossel' },
  { icon: 'grid', label: 'Galeria' },
  { icon: 'help', label: 'Perguntas frequentes' },
];

const slots = ['09:00', '09:45', '10:30', '11:15', '13:00', '13:45', '14:30', '15:15'];
const bars = [38, 52, 44, 66, 58, 82, 70, 94, 76, 88, 62, 104, 90, 118];

const steps = [
  {
    title: 'Crie sua conta',
    text: 'Use o e-mail e confirme com um código de 6 dígitos. Leva menos de um minuto.',
  },
  {
    title: 'Monte sua página',
    text: 'Escolha um tema, adicione blocos e veja o resultado no celular e no computador.',
  },
  {
    title: 'Publique e compartilhe',
    text: 'Divulgue seu endereço e acompanhe visitas e cliques pelo painel.',
  },
];

function formatPrice(cents: number) {
  return cents === 0 ? 'R$ 0' : `R$ ${(cents / 100).toFixed(0)}`;
}

function planFeatures(entitlements: Entitlements) {
  return [
    { text: `Até ${entitlements.maxBlocks} blocos por página`, on: true },
    { text: `Até ${entitlements.maxImages} imagens enviadas`, on: true },
    { text: 'Todos os temas e estilos', on: true },
    {
      text: entitlements.booking
        ? `Agenda com até ${entitlements.maxBookingServices} serviços`
        : 'Agenda de reservas',
      on: entitlements.booking,
    },
    { text: `Estatísticas dos últimos ${entitlements.analyticsDays} dias`, on: true },
  ];
}

function PlanCard({ plan, featured }: { plan: PlanDefinition; featured: boolean }) {
  return (
    <div className={featured ? 'lp-plan lp-plan-featured lp-reveal' : 'lp-plan lp-reveal'}>
      {featured && <span className="lp-plan-flag">Mais completo</span>}
      <h3>{plan.name}</h3>
      <p className="lp-price">
        {formatPrice(plan.priceCents)}
        <small> / mês</small>
      </p>
      <ul>
        {planFeatures(plan.entitlements).map((feature) => (
          <li key={feature.text} data-off={feature.on ? 'false' : 'true'}>
            <Icon name={feature.on ? 'check' : 'x'} />
            {feature.text}
          </li>
        ))}
      </ul>
      <Link
        href="/admin/login?mode=register"
        className={featured ? 'btn btn-primary btn-lg' : 'btn btn-lg'}
      >
        {featured ? 'Assinar o Pro' : 'Começar grátis'}
      </Link>
    </div>
  );
}

function MiniPhone({ theme, name }: { theme: Theme; name: string }) {
  return (
    <div className="lp-theme">
      <div className="lp-mini">
        <div className="lp-mini-inner">
          <PageRenderer content={samplePage(theme)} fill="container" />
        </div>
      </div>
      <span>{name}</span>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="app lp">
      <header className="lp-header lp-night">
        <div className="lp-header-inner">
          <Brand />
          <nav className="lp-nav" aria-label="Seções">
            <a href="#recursos">Recursos</a>
            <a href="#temas">Temas</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#planos">Planos</a>
          </nav>
          <div className="lp-actions">
            <ThemeToggle />
            <Link href="/admin/login" className="btn">
              Entrar
            </Link>
            <Link href="/admin/login?mode=register" className="btn btn-primary">
              Criar página
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-hero lp-night">
          <div className="lp-stars" aria-hidden="true" />
          <div className="lp-moon" aria-hidden="true" />
          <div className="lp-container lp-hero-grid">
            <div className="lp-hero-copy">
              <span className="lp-eyebrow">
                <Icon name="sparkles" />
                Novo: carrossel, redes sociais e animações
              </span>
              <h1>
                Páginas que <span className="lp-gradient-text">brilham</span>, feitas em minutos
              </h1>
              <p className="lp-lead">
                Monte sua página com blocos, temas prontos, agenda de reservas e estatísticas. Sem
                escrever uma linha de código.
              </p>
              <div className="lp-cta">
                <Link href="/admin/login?mode=register" className="btn btn-primary btn-lg">
                  Criar minha página grátis
                </Link>
                <a href="#temas" className="btn btn-lg">
                  Ver temas
                </a>
              </div>
              <ul className="lp-bullets">
                <li>
                  <Icon name="check" />
                  Sem cartão de crédito
                </li>
                <li>
                  <Icon name="check" />
                  Pronta em minutos
                </li>
                <li>
                  <Icon name="check" />
                  Funciona no celular
                </li>
              </ul>
            </div>

            <div className="lp-phones" aria-hidden="true">
              <div className="lp-phone lp-phone-left">
                <PageRenderer content={leftPage} fill="container" />
              </div>
              <div className="lp-phone lp-phone-right">
                <PageRenderer content={rightPage} fill="container" />
              </div>
              <div className="lp-phone lp-phone-center">
                <PageRenderer content={centerPage} fill="container" />
              </div>
            </div>
          </div>
        </section>

        <div className="lp-container">
          <div className="lp-strip">
            {stats.map((stat) => (
              <div key={stat.label} className="lp-stat">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <section id="recursos" className="lp-section">
          <div className="lp-container">
            <div className="lp-section-head lp-reveal">
              <span className="lp-kicker">Recursos</span>
              <h2>Tudo o que sua página precisa para brilhar</h2>
              <p>Do visual à agenda, em um só lugar e com um painel simples de usar.</p>
            </div>

            <div className="lp-bento">
              <article className="lp-bcard lp-bcard-night lp-night span-3 lp-reveal">
                <h3>Blocos para tudo</h3>
                <p>
                  Cabeçalho, destaque, links, redes sociais, carrossel, galeria, perguntas e vídeo.
                  Cada um com vários estilos, e você reordena arrastando.
                </p>
                <div className="lp-stack" aria-hidden="true">
                  {stackBlocks.map((block, index) => (
                    <div
                      key={block.label}
                      className="lp-stack-item"
                      data-drag={index === 2 ? 'true' : undefined}
                      style={{ '--i': index } as React.CSSProperties}
                    >
                      <Icon name="grip" />
                      <Icon name={block.icon} />
                      {block.label}
                    </div>
                  ))}
                </div>
              </article>

              <article className="lp-bcard span-3 lp-reveal">
                <h3>{THEME_PRESETS.length} temas e controle total</h3>
                <p>Cores, fontes, botões, cantos e fundo. Comece por um tema pronto e ajuste.</p>
                <div className="lp-swatches" aria-hidden="true">
                  {THEME_PRESETS.slice(0, 8).map((item) => (
                    <span
                      key={item.id}
                      title={item.name}
                      style={
                        {
                          '--from': item.theme.background,
                          '--to': item.theme.backgroundEnd ?? item.theme.background,
                          '--dot': item.theme.primaryColor,
                        } as React.CSSProperties
                      }
                    />
                  ))}
                </div>
              </article>

              <article className="lp-bcard span-2 lp-reveal">
                <h3>Agenda de reservas</h3>
                <p>Seus clientes escolhem um horário livre, sem conflitos.</p>
                <div className="lp-slots" aria-hidden="true">
                  {slots.map((slot, index) => (
                    <span key={slot} data-active={index === 2 ? 'true' : undefined}>
                      {slot}
                    </span>
                  ))}
                </div>
              </article>

              <article className="lp-bcard span-2 lp-reveal">
                <h3>Estatísticas</h3>
                <p>Visitas e cliques por link, sem guardar dados pessoais.</p>
                <div className="lp-chart" aria-hidden="true">
                  <div className="lp-chart-tag">
                    <Icon name="chart" />
                    +23% esta semana
                  </div>
                  <div className="lp-chart-bars">
                    {bars.map((height, index) => (
                      <i key={index} style={{ height }} />
                    ))}
                  </div>
                </div>
              </article>

              <article className="lp-bcard span-2 lp-reveal">
                <h3>Redes sociais</h3>
                <p>{SOCIAL_NETWORKS.length} redes, com ícones nas cores da marca.</p>
                <div className="lp-social-demo" aria-hidden="true">
                  <BlockPreview block={socialPreview} theme={preset('meia-noite')} />
                </div>
              </article>

              <article className="lp-bcard lp-bcard-night lp-night span-3 lp-reveal">
                <h3>Animações ao rolar</h3>
                <p>
                  Faça cada bloco surgir com fade, zoom ou deslize. Desligado por padrão, você
                  escolhe onde usar.
                </p>
                <div className="lp-anim-demo" aria-hidden="true">
                  <span style={{ '--d': '0s' } as React.CSSProperties}>fade-up</span>
                  <span style={{ '--d': '0.5s' } as React.CSSProperties}>zoom-in</span>
                  <span style={{ '--d': '1s' } as React.CSSProperties}>fade-right</span>
                </div>
              </article>

              <article className="lp-bcard span-3 lp-reveal">
                <h3>Seguro por padrão</h3>
                <p>
                  Login com verificação em duas etapas, imagens verificadas, limites contra abuso e
                  moderação de denúncias.
                </p>
                <div className="lp-shield" aria-hidden="true">
                  <span className="lp-shield-icon">
                    <Icon name="lock" />
                  </span>
                  <span>Verificação em 2 etapas</span>
                  <span>Imagens verificadas</span>
                  <span>Limites contra abuso</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="temas" className="lp-section lp-section-tight">
          <div className="lp-container">
            <div className="lp-section-head lp-reveal">
              <span className="lp-kicker">Temas</span>
              <h2>Comece com um tema pronto</h2>
              <p>
                Cores, fonte, botões e fundo combinados. Troque com um clique e ajuste o que quiser.
              </p>
            </div>
          </div>
          <div className="lp-marquee" aria-hidden="true">
            <div className="lp-marquee-track">
              {[...marquee, ...marquee].map((item, index) => (
                <MiniPhone key={`${item.id}-${index}`} theme={item.theme} name={item.name} />
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="lp-section">
          <div className="lp-container">
            <div className="lp-section-head lp-reveal">
              <span className="lp-kicker">Como funciona</span>
              <h2>Três passos entre você e a sua página no ar</h2>
            </div>
            <div className="lp-steps">
              {steps.map((step) => (
                <div key={step.title} className="lp-step lp-reveal">
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="planos" className="lp-section lp-section-tight">
          <div className="lp-container">
            <div className="lp-section-head lp-reveal">
              <span className="lp-kicker">Planos</span>
              <h2>Planos simples</h2>
              <p>Comece de graça e assine o Pro quando precisar de agenda e mais espaço.</p>
            </div>
            <div className="lp-plans">
              <PlanCard plan={PLANS.FREE} featured={false} />
              <PlanCard plan={PLANS.PRO} featured />
            </div>
            <p className="lp-note">Ambiente de demonstração: o pagamento do Pro é simulado.</p>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-container">
            <div className="lp-final lp-night lp-reveal">
              <div className="lp-stars" aria-hidden="true" />
              <div className="lp-final-moon" aria-hidden="true" />
              <h2>Pronto para criar a sua?</h2>
              <p>Leva alguns minutos. Você pode mudar o visual quando quiser.</p>
              <Link href="/admin/login?mode=register" className="btn btn-lg lp-final-btn">
                Criar minha página grátis
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <Brand />
          <nav aria-label="Rodapé">
            <a href="#recursos">Recursos</a>
            <a href="#temas">Temas</a>
            <a href="#planos">Planos</a>
            <Link href="/admin/login">Entrar</Link>
          </nav>
          <span>© {new Date().getFullYear()} Moonlight</span>
        </div>
      </footer>
    </div>
  );
}
