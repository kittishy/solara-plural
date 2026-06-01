import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — Solara Plural",
  description:
    "Política de privacidade do aplicativo Solara Plural: quais dados coletamos, como usamos e seus direitos.",
};

const LAST_UPDATED = "28 de maio de 2026";
const CONTACT_EMAIL = "solara.julia.a@gmail.com";

export default function PrivacyPolicyPage() {
  return (
    <main
      style={{
        maxWidth: "760px",
        margin: "0 auto",
        padding: "48px 20px 96px",
        lineHeight: 1.7,
        fontFamily:
          "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: "#1c1c1e",
      }}
    >
      <h1 style={{ fontSize: "1.9rem", fontWeight: 700, marginBottom: "0.25rem" }}>
        Política de Privacidade
      </h1>
      <p style={{ color: "#6b7280", marginTop: 0 }}>
        Solara Plural · Última atualização: {LAST_UPDATED}
      </p>

      <p>
        Esta Política de Privacidade descreve como o aplicativo <strong>Solara Plural</strong>{" "}
        (&quot;aplicativo&quot;, &quot;nós&quot;) coleta, usa e protege as informações de quem
        utiliza o serviço (&quot;você&quot;). O Solara Plural é um aplicativo voltado a sistemas
        plurais para acompanhamento do dia a dia. Levamos sua privacidade a sério e coletamos
        apenas o necessário para o funcionamento do app.
      </p>

      <h2 style={headingStyle}>1. Informações que coletamos</h2>
      <ul>
        <li>
          <strong>Dados de conta:</strong> endereço de e-mail e senha (armazenada de forma
          criptografada) usados para autenticação e acesso à sua conta.
        </li>
        <li>
          <strong>Conteúdo criado por você:</strong> informações de perfil do sistema, registros,
          anotações e demais conteúdos que você opta por inserir no aplicativo.
        </li>
        <li>
          <strong>Preferências do app:</strong> idioma, tema e configurações de notificação.
        </li>
        <li>
          <strong>Dados técnicos mínimos:</strong> informações necessárias para entrega de
          notificações push e para manter sua sessão ativa.
        </li>
      </ul>

      <h2 style={headingStyle}>2. Como usamos suas informações</h2>
      <ul>
        <li>Fornecer, manter e melhorar o funcionamento do aplicativo.</li>
        <li>Autenticar seu acesso e manter sua conta segura.</li>
        <li>Enviar notificações que você tenha ativado.</li>
        <li>Salvar e sincronizar o conteúdo que você cria.</li>
      </ul>

      <h2 style={headingStyle}>3. Compartilhamento de dados</h2>
      <p>
        Nós <strong>não vendemos</strong> seus dados pessoais e <strong>não compartilhamos</strong>{" "}
        seu conteúdo com terceiros para fins de publicidade. Os dados podem ser processados por
        provedores de infraestrutura que hospedam o aplicativo, estritamente para a operação do
        serviço e sob obrigações de confidencialidade.
      </p>

      <h2 style={headingStyle}>4. Armazenamento e segurança</h2>
      <p>
        Adotamos medidas técnicas razoáveis para proteger suas informações, incluindo conexões
        criptografadas (HTTPS) e armazenamento seguro de credenciais. Mantemos seus dados enquanto
        sua conta estiver ativa.
      </p>

      <h2 style={headingStyle}>5. Seus direitos</h2>
      <p>
        Você pode acessar, corrigir ou excluir suas informações a qualquer momento dentro do
        aplicativo. Para solicitar a exclusão completa da sua conta e dos dados associados, entre em
        contato pelo e-mail abaixo.
      </p>

      <h2 style={headingStyle}>6. Privacidade de crianças</h2>
      <p>
        O Solara Plural não é direcionado a menores de 13 anos e não coletamos intencionalmente
        dados de crianças nessa faixa etária.
      </p>

      <h2 style={headingStyle}>7. Alterações nesta política</h2>
      <p>
        Podemos atualizar esta Política de Privacidade periodicamente. A data de &quot;última
        atualização&quot; no topo desta página indica a versão vigente.
      </p>

      <h2 style={headingStyle}>8. Contato</h2>
      <p>
        Em caso de dúvidas sobre esta Política de Privacidade ou sobre o tratamento dos seus dados,
        entre em contato pelo e-mail:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#2563eb" }}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </main>
  );
}

const headingStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 600,
  marginTop: "2rem",
  marginBottom: "0.5rem",
};
