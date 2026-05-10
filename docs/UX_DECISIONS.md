# UX Decisions — Solara Plural
*Decisões tomadas em sessão de revisão de produto em 10/05/2026*

---

## Contexto

Solara Plural é usado várias vezes ao dia. As mudanças abaixo priorizam qualidade de vida no uso diário, não features novas. Implemente uma por vez, na ordem abaixo.

---

## Mudança 1 — Home simplificada

**Problema:** A home tem informação duplicada e elementos que o usuário não usa.

- Os cards de navegação (Front, Members, New note, History, Friends) não são usados — o usuário navega pela tab bar.
- Os stats numéricos (162 / 1 / 3) são redundantes com o Current front abaixo.
- O "Current front" é o elemento mais importante da home mas aparece por último.

**O que fazer:**

Remover da home:
- Todos os cards de navegação (Front, Members, New note, History, Friends)
- A seção de stats (Members 162, Notes 1, Front 3)

Manter na home, nessa ordem:
1. Saudação (data + "Good night, Solara")
2. Current front (avatares + nomes + since X:XX PM)
3. Recent notes

Não adicionar nada novo. Só remover o que não serve.

---

## Mudança 2 — Trocar front direto da lista de membros

**Problema:** Trocar o front exige ir na aba Front, abrir um dropdown com 162 membros, selecionar, confirmar. São muitos passos para a ação mais frequente do app.

**Contexto importante:** O sistema tem 162 membros. Não usar "favoritos" ou "recentes" pois isso cria hierarquia implícita entre membros, o que é emocionalmente problemático para sistemas plurais.

**O que já existe:** Na lista de membros (aba Members), cada membro já tem um menu de ação configurável com opções: "Add to front", "Set as front", "Sync to PK", "No action". O botão `+` ao lado de cada membro já executa a ação configurada.

**O que fazer:**

Garantir que as ações "Add to front" e "Set as front" na lista de membros funcionem corretamente e sem precisar navegar para a aba Front.

O fluxo ideal é:
1. Usuário abre aba Members
2. Toca no `+` ao lado do membro (ou segura para ver o menu)
3. Ação é executada imediatamente
4. Feedback visual confirma que o front foi atualizado

Não criar nova UI. Usar o que já existe e garantir que funciona.

---

## Regras que não mudam

- Não criar hierarquia entre membros (sem favoritos, sem destacados por frequência)
- Não adicionar features novas nessa sessão
- Não redesenhar componentes que já funcionam
- Preservar o design system existente (cores, tipografia, bordas, animações)
- Testar no mobile antes de considerar pronto
