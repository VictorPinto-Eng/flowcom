import Link from 'next/link';
import styles from '@/app/landing.module.css';

export default function LandingPage() {
  return (
    <div className={styles.landingWrapper}>
      {/* Header Navbar */}
      <header className={styles.navbar}>
        <div className={styles.logo}>
          💼 Flow<span>.</span>
        </div>
        <nav className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>Recursos</a>
          <a href="#pricing" className={styles.navLink}>Preços</a>
          <a href="#testimonials" className={styles.navLink}>Depoimentos</a>
        </nav>
        <div>
          <Link href="/dashboard" className={styles.ctaButton}>
            Acessar Painel
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>✨ NOVO FLOW 2.0</div>
          <h1 className={styles.heroTitle}>
            Gerencie seus projetos com <span>fluxo contínuo</span> e elegância.
          </h1>
          <p className={styles.heroSubtitle}>
            A plataforma ágil que unifica equipes, automatiza relatórios de atividades e oferece espaços de trabalho sofisticados para você focar no que realmente importa.
          </p>
          <div className={styles.heroActions}>
            <Link href="/dashboard" className={styles.ctaButton}>
              Iniciar Gratuitamente
            </Link>
            <a href="#features" className={styles.secondaryButton}>
              Ver Recursos
            </a>
          </div>
        </div>

        {/* Premium CSS Mockup Illustration */}
        <div className={styles.heroVisual}>
          <div className={styles.mockupContainer}>
            <div className={styles.mockupHeader}>
              <div className={styles.mockupDots}>
                <div className={styles.mockupDot}></div>
                <div className={styles.mockupDot}></div>
                <div className={styles.mockupDot}></div>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                app.flow.io/workspace
              </span>
            </div>
            
            <div className={styles.mockupColumns}>
              {/* Column 1 */}
              <div className={styles.mockupColumn}>
                <span className={styles.mockupColTitle}>A Fazer</span>
                <div className={styles.mockupCard}>
                  <span className={styles.mockupCardTitle}>Refatorar Header</span>
                  <div className={styles.mockupCardLines}>
                    <div className={styles.mockupLine}></div>
                    <div className={`${styles.mockupLine} ${styles.mockupLineShort}`}></div>
                  </div>
                </div>
                <div className={styles.mockupCard}>
                  <span className={styles.mockupCardTitle}>Revisão de Código</span>
                  <div className={styles.mockupCardLines}>
                    <div className={styles.mockupLine}></div>
                  </div>
                </div>
              </div>

              {/* Column 2 */}
              <div className={styles.mockupColumn}>
                <span className={styles.mockupColTitle}>Em Progresso</span>
                <div className={styles.mockupCard} style={{ borderColor: 'rgba(124, 58, 237, 0.3)' }}>
                  <span className={styles.mockupCardTitle} style={{ color: 'var(--accent-primary)' }}>✨ Landing Page CSS</span>
                  <div className={styles.mockupCardLines}>
                    <div className={styles.mockupLine}></div>
                    <div className={styles.mockupLine}></div>
                  </div>
                </div>
              </div>

              {/* Column 3 */}
              <div className={styles.mockupColumn}>
                <span className={styles.mockupColTitle}>Concluído</span>
                <div className={styles.mockupCard} style={{ opacity: 0.7 }}>
                  <span className={styles.mockupCardTitle} style={{ textDecoration: 'line-through' }}>Banco de Dados</span>
                  <div className={styles.mockupCardLines}>
                    <div className={styles.mockupLine}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating cards for layered depth */}
          <div className={styles.floatingCard1}>
            <span style={{ fontSize: '1.2rem' }}>⚡</span>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>Performance Alta</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>+40% Produtividade</div>
            </div>
          </div>

          <div className={styles.floatingCard2}>
            <div className={styles.avatarRing}>
              <div className={styles.miniAvatar}>VP</div>
              <div className={styles.miniAvatar} style={{ background: '#0ea5e9' }}>JD</div>
              <div className={styles.miniAvatar} style={{ background: '#10b981' }}>+3</div>
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600 }}>Equipe Ativa</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Tudo o que sua equipe precisa para vencer</h2>
          <p className={styles.sectionSubtitle}>
            Conecte pessoas, defina metas de alto nível e mantenha o acompanhamento em tempo real em uma interface polida de última geração.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          {/* Feature 1 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>💼</div>
            <h3 className={styles.featureTitle}>Áreas de Trabalho</h3>
            <p className={styles.featureDesc}>
              Organize seus quadros Kanban por projetos, departamentos ou clientes em múltiplos espaços integrados de fácil transição.
            </p>
          </div>

          {/* Feature 2 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🔄</div>
            <h3 className={styles.featureTitle}>Kanban Dinâmico</h3>
            <p className={styles.featureDesc}>
              Gerencie suas atividades diárias com extrema fluidez, arrastando cartões e visualizando o progresso instantaneamente.
            </p>
          </div>

          {/* Feature 3 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h3 className={styles.featureTitle}>Relatórios Inteligentes</h3>
            <p className={styles.featureDesc}>
              Gere de forma automática relatórios detalhados com tempos de entrega, tarefas completadas e estatísticas de performance de sua equipe.
            </p>
          </div>

          {/* Feature 4 */}
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🏢</div>
            <h3 className={styles.featureTitle}>Sectores / Departamentos</h3>
            <p className={styles.featureDesc}>
              Classifique seus quadros de acordo com os setores da sua empresa para ter um ecossistema corporativo totalmente estruturado.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className={styles.pricingSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Planos simples, transparentes e escaláveis</h2>
          <p className={styles.sectionSubtitle}>
            Escolha a opção ideal para impulsionar a velocidade operacional de suas equipes. Cancele quando quiser.
          </p>
        </div>

        <div className={styles.pricingGrid}>
          {/* Plan 1 */}
          <div className={styles.pricingCard}>
            <h3 className={styles.planName}>Básico</h3>
            <p className={styles.planDesc}>Ideal para profissionais autônomos ou experimentação inicial.</p>
            <div className={styles.planPrice}>
              <span className={styles.priceSymbol}>R$</span>
              <span className={styles.priceNumber}>0</span>
              <span className={styles.pricePeriod}>/mês</span>
            </div>
            <ul className={styles.planFeatures}>
              <li className={styles.planFeatureItem}><span className={styles.featureCheck}>✓</span> 1 Espaço de Trabalho (Workspace)</li>
              <li className={styles.planFeatureItem}><span className={styles.featureCheck}>✓</span> Até 3 Quadros Kanban</li>
              <li className={styles.planFeatureItem}><span className={styles.featureCheck}>✓</span> Limite de 50 Cartões Ativos</li>
              <li className={styles.planFeatureItem}><span className={styles.featureCheck}>✓</span> Suporte da Comunidade</li>
            </ul>
            <Link href="/dashboard" className={styles.pricingBtn}>
              Começar Grátis
            </Link>
          </div>

          {/* Plan 2 */}
          <div className={`${styles.pricingCard} ${styles.pricingCardFeatured}`}>
            <div className={styles.popularBadge}>Mais Escolhido</div>
            <h3 className={styles.planName}>Profissional</h3>
            <p className={styles.planDesc}>Perfeito para equipes em crescimento que necessitam de colaboração ágil.</p>
            <div className={styles.planPrice}>
              <span className={styles.priceSymbol}>R$</span>
              <span className={styles.priceNumber}>49</span>
              <span className={styles.pricePeriod}>/mês</span>
            </div>
            <ul className={styles.planFeatures}>
              <li className={styles.planFeatureItem}><span className={styles.featureCheck}>✓</span> **Múltiplos Workspaces** Ilimitados</li>
              <li className={styles.planFeatureItem}><span className={styles.featureCheck}>✓</span> Quadros Kanban Ilimitados</li>
              <li className={styles.planFeatureItem}><span className={styles.featureCheck}>✓</span> Cartões & Anexos Sem Limites</li>
              <li className={styles.planFeatureItem}><span className={styles.featureCheck}>✓</span> Relatório de Atividades Premium</li>
              <li className={styles.planFeatureItem}><span className={styles.featureCheck}>✓</span> Suporte Prioritário 24/7</li>
            </ul>
            <Link href="/dashboard" className={`${styles.pricingBtn} ${styles.pricingBtnFeatured}`}>
              Experimentar Grátis
            </Link>
          </div>

          {/* Plan 3 */}
          <div className={styles.pricingCard}>
            <h3 className={styles.planName}>Corporativo</h3>
            <p className={styles.planDesc}>Projetado sob medida para grandes organizações com demandas complexas de governança.</p>
            <div className={styles.planPrice}>
              <span className={styles.priceSymbol}>R$</span>
              <span className={styles.priceNumber}>Sob</span>
              <span className={styles.pricePeriod}>consulta</span>
            </div>
            <ul className={styles.planFeatures}>
              <li className={styles.planFeatureItem}><span className={styles.featureCheck}>✓</span> Tudo do plano Profissional</li>
              <li className={styles.planFeatureItem}><span className={styles.featureCheck}>✓</span> SSO / Autenticação Corporativa</li>
              <li className={styles.planFeatureItem}><span className={styles.featureCheck}>✓</span> SLA de Disponibilidade de 99.9%</li>
              <li className={styles.planFeatureItem}><span className={styles.featureCheck}>✓</span> Gerente de Sucesso Dedicado</li>
            </ul>
            <button className={styles.pricingBtn}>
              Falar com Vendas
            </button>
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContainer}>
          <h2 className={styles.ctaTitle}>Eleve a produtividade de sua equipe hoje mesmo</h2>
          <p className={styles.ctaDesc}>
            Junte-se a centenas de desenvolvedores, gerentes de produto e times operacionais que utilizam o Flow para organizar seus fluxos diários com maestria.
          </p>
          <Link href="/dashboard" className={styles.ctaWhiteBtn}>
            Criar Minha Conta Grátis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerColMain}>
            <div className={styles.footerLogo}>💼 Flow<span>.</span></div>
            <p className={styles.footerSlogan}>
              Unificando colaboração, organização visual e métricas de desempenho sob a mesma interface refinada.
            </p>
          </div>
          <div className={styles.footerCol}>
            <h4 className={styles.footerTitle}>Produto</h4>
            <ul className={styles.footerLinkList}>
              <li className={styles.footerLink}>Funcionalidades</li>
              <li className={styles.footerLink}>Segurança</li>
              <li className={styles.footerLink}>Preços</li>
              <li className={styles.footerLink}>Roadmap</li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h4 className={styles.footerTitle}>Empresa</h4>
            <ul className={styles.footerLinkList}>
              <li className={styles.footerLink}>Sobre Nós</li>
              <li className={styles.footerLink}>Carreiras</li>
              <li className={styles.footerLink}>Blog</li>
              <li className={styles.footerLink}>Imprensa</li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h4 className={styles.footerTitle}>Suporte</h4>
            <ul className={styles.footerLinkList}>
              <li className={styles.footerLink}>Central de Ajuda</li>
              <li className={styles.footerLink}>Status do Sistema</li>
              <li className={styles.footerLink}>Contato</li>
              <li className={styles.footerLink}>API</li>
            </ul>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>&copy; {new Date().getFullYear()} Flow. Todos os direitos reservados.</p>
          <p>Criado com elegância para equipes modernas.</p>
        </div>
      </footer>
    </div>
  );
}
