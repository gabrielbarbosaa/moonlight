import { PageRenderer } from '@sitebuilder/renderer';
import {
  DEFAULT_THEME,
  PLANS,
  THEME_PRESETS,
  samplePage,
  type Entitlements,
  type PageContent,
  type PlanDefinition,
} from '@sitebuilder/schemas';
import Link from 'next/link';
import { Brand } from '@/components/brand';
import { Icon, type IconName } from '@/components/icons';
import { ThemeToggle } from '@/components/theme-toggle';

const heroPage: PageContent = {
  ...samplePage({
    ...DEFAULT_THEME,
    primaryColor: '#6366f1',
    background: '#eef2ff',
    backgroundType: 'gradient',
    backgroundEnd: '#ddd6fe',
    buttonShape: 'pill',
    radius: 'large',
  }),
  blocks: [
    {
      id: 'lp-header',
      type: 'header',
      variant: 'centered',
      props: { title: 'Marina Costa' },
    },
    {
      id: 'lp-hero',
      type: 'hero',
      variant: 'card',
      props: {
        heading: 'Design que conta histórias',
        subheading: 'Identidades visuais e sites para marcas autorais.',
        ctaLabel: 'Agendar conversa',
        ctaUrl: 'https://example.com/agenda',
      },
    },
    {
      id: 'lp-links',
      type: 'links',
      variant: 'cards',
      props: {
        items: [
          { id: 'lp-l1', label: 'Portfólio', url: 'https://example.com/portfolio' },
          { id: 'lp-l2', label: 'Newsletter', url: 'https://example.com/newsletter' },
          { id: 'lp-l3', label: 'Instagram', url: 'https://example.com/instagram' },
        ],
      },
    },
    {
      id: 'lp-footer',
      type: 'footer',
      variant: 'band',
      props: { text: 'marina.seusite.com' },
    },
  ],
};

const showcaseIds = ['oceano', 'meia-noite', 'papel', 'neon'];
const showcase = THEME_PRESETS.filter((preset) => showcaseIds.includes(preset.id));

const features: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'blocks',
    title: 'Blocos flexíveis',
    text: 'Cabeçalho, destaque, links, texto e rodapé, cada um com vários estilos. Reordene arrastando.',
  },
  {
    icon: 'palette',
    title: 'Temas e personalização',
    text: '8 temas prontos e controle de cores, fontes, botões, cantos, espaçamento e fundo.',
  },
  {
    icon: 'globe',
    title: 'Seu endereço',
    text: 'Sua página em maria.seusite.com, com a pré-visualização ao vivo enquanto você edita.',
  },
  {
    icon: 'chart',
    title: 'Estatísticas',
    text: 'Visitas, visitantes únicos e cliques por link, sem guardar dados pessoais dos visitantes.',
  },
  {
    icon: 'calendar',
    title: 'Agenda de reservas',
    text: 'Seus clientes escolhem um horário livre. Sem conflitos, com confirmação por e-mail.',
  },
  {
    icon: 'lock',
    title: 'Seguro por padrão',
    text: 'Login com verificação em duas etapas, limites contra abuso e moderação de denúncias.',
  },
];

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
    <div className={featured ? 'lp-plan lp-plan-featured' : 'lp-plan'}>
      <h3>
        {plan.name}
        {featured && <span className="badge">Mais completo</span>}
      </h3>
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

export default function LandingPage() {
  return (
    <div className="app">
      <header className="lp-header">
        <div className="lp-container lp-header-inner">
          <Brand />
          <nav className="lp-nav" aria-label="Seções">
            <a href="#recursos">Recursos</a>
            <a href="#temas">Temas</a>
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
        <section className="lp-hero">
          <div className="lp-container lp-hero-grid">
            <div>
              <span className="lp-eyebrow">
                <Icon name="sparkles" />
                Páginas pessoais com blocos
              </span>
              <h1>
                Sua página, do seu jeito, <span className="lp-gradient-text">em minutos</span>
              </h1>
              <p className="lp-lead">
                Monte uma página bonita com blocos e temas prontos, receba reservas e acompanhe as
                visitas. Sem código e sem complicação.
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
            <div className="lp-hero-visual" aria-hidden="true">
              <div className="lp-phone">
                <div className="lp-phone-screen">
                  <PageRenderer content={heroPage} fill="container" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="lp-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <h2>Tudo o que sua página precisa</h2>
              <p>Do visual à agenda, em um só lugar e com um painel simples de usar.</p>
            </div>
            <div className="lp-features">
              {features.map((feature) => (
                <div key={feature.title} className="lp-feature">
                  <span className="icon-tile">
                    <Icon name={feature.icon} />
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="temas" className="lp-section lp-section-alt">
          <div className="lp-container">
            <div className="lp-section-head">
              <h2>Comece com um tema pronto</h2>
              <p>
                Cores, fonte, botões e fundo combinados. Troque com um clique e ajuste o que quiser.
              </p>
            </div>
            <div className="lp-themes" aria-hidden="true">
              {showcase.map((preset) => (
                <div key={preset.id} className="lp-theme">
                  <div className="lp-mini">
                    <div className="lp-mini-inner">
                      <PageRenderer content={samplePage(preset.theme)} fill="container" />
                    </div>
                  </div>
                  {preset.name}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-container">
            <div className="lp-section-head">
              <h2>Como funciona</h2>
              <p>Três passos entre você e a sua página no ar.</p>
            </div>
            <div className="lp-steps">
              {steps.map((step) => (
                <div key={step.title} className="lp-step">
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="planos" className="lp-section lp-section-alt">
          <div className="lp-container">
            <div className="lp-section-head">
              <h2>Planos simples</h2>
              <p>Comece de graça e assine o Pro quando precisar de agenda e mais espaço.</p>
            </div>
            <div className="lp-plans">
              <PlanCard plan={PLANS.FREE} featured={false} />
              <PlanCard plan={PLANS.PRO} featured />
            </div>
            <p
              className="muted"
              style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem' }}
            >
              Ambiente de demonstração: o pagamento do Pro é simulado.
            </p>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-final">
            <h2>Pronto para criar a sua?</h2>
            <p>Leva alguns minutos. Você pode mudar o visual quando quiser.</p>
            <Link href="/admin/login?mode=register" className="btn btn-primary btn-lg">
              Criar minha página grátis
            </Link>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <Brand />
          <span>© {new Date().getFullYear()} SiteBuilder</span>
        </div>
      </footer>
    </div>
  );
}
