# CLAUDE.md — Diretrizes de Desenvolvimento de Software

Este arquivo define os padrões, princípios e expectativas que devem guiar **toda** interação de desenvolvimento neste projeto. Leia com atenção antes de escrever qualquer linha de código.

---

## 1. Filosofia Central

> "Código é lido muito mais do que escrito. Otimize para o leitor, não para o escritor."

- **Clareza > Esperteza**: Prefira código óbvio e legível a soluções brilhantes e obscuras.
- **Simplicidade > Prematura generalização**: Não abstraia antes de ver o padrão repetido pelo menos três vezes (regra de três).
- **Explicitidade > Implicitidade**: Nomes, contratos e intenções devem ser explícitos. Evite efeitos colaterais ocultos.
- **Consistência acima de preferências pessoais**: Siga os padrões do projeto mesmo que você prefira outra abordagem.

---

## 2. Princípios SOLID (não-negociáveis)

Aplique sempre. Se uma solução violar um desses princípios, refatore antes de avançar.

### S — Single Responsibility Principle

Cada classe, módulo ou função deve ter **uma única razão para mudar**.

```
❌ UserService: valida, persiste, envia e-mail e gera relatório
✅ UserService: orquestra | UserValidator | UserRepository | EmailNotifier
```

### O — Open/Closed Principle

Entidades devem ser **abertas para extensão, fechadas para modificação**.
Prefira composição e interfaces a modificar código existente e testado.

### L — Liskov Substitution Principle

Subtipos devem ser **substituíveis por seus tipos base** sem quebrar o comportamento esperado.
Se um `override` muda a semântica do contrato pai, algo está errado no design.

### I — Interface Segregation Principle

**Não force dependências de métodos que o cliente não usa.**
Interfaces grandes devem ser quebradas em interfaces menores e coesas.

### D — Dependency Inversion Principle

**Dependa de abstrações, não de implementações concretas.**
Use injeção de dependência. Nunca instancie dependências externas diretamente dentro de classes de domínio.

---

## 3. Outras Boas Práticas de Design

### DRY — Don't Repeat Yourself

Duplicação de conhecimento é a raiz de grande parte dos bugs. Toda lógica de negócio deve ter **uma única representação autoritativa** no sistema.

### YAGNI — You Aren't Gonna Need It

Não implemente funcionalidades antecipadas. Implemente o que é necessário **agora**. Extensibilidade prematura gera complexidade sem valor.

### Tell, Don't Ask

Diga a um objeto o que fazer; não pergunte seu estado para tomar decisões por fora dele.

```
❌ if (order.getStatus() == PENDING) { order.setStatus(CONFIRMED); }
✅ order.confirm();
```

### Lei de Demeter

Um módulo não deve conhecer os detalhes internos dos objetos que manipula. Evite cadeias longas: `a.getB().getC().doSomething()`.

---

## 4. Padrões de Design (Design Patterns)

Ao identificar um problema recorrente, avalie o padrão adequado antes de criar uma solução ad-hoc.

### Criacionais

| Problema                                                | Padrão sugerido                 |
| ------------------------------------------------------- | ------------------------------- |
| Criação complexa de objetos com muitos parâmetros       | **Builder**                     |
| Família de objetos relacionados sem expor implementação | **Abstract Factory**            |
| Uma única instância global controlada                   | **Singleton** (use com cautela) |
| Clonar objetos sem depender de suas classes             | **Prototype**                   |

### Estruturais

| Problema                                          | Padrão sugerido |
| ------------------------------------------------- | --------------- |
| Interface incompatível entre sistemas             | **Adapter**     |
| Adicionar responsabilidades dinamicamente         | **Decorator**   |
| Simplificar interface de subsistema complexo      | **Facade**      |
| Compartilhar estado entre muitos objetos pequenos | **Flyweight**   |
| Compor objetos em estruturas de árvore            | **Composite**   |

### Comportamentais

| Problema                                             | Padrão sugerido             |
| ---------------------------------------------------- | --------------------------- |
| Variar algoritmos em tempo de execução               | **Strategy**                |
| Notificar múltiplos objetos sobre mudanças de estado | **Observer**                |
| Encapsular requisições como objetos                  | **Command**                 |
| Definir esqueleto de algoritmo, delegar etapas       | **Template Method**         |
| Percorrer coleções sem expor estrutura interna       | **Iterator**                |
| Adicionar operações sem alterar classes              | **Visitor**                 |
| Gerenciar estados e transições complexas             | **State**                   |
| Encadear handlers de forma desacoplada               | **Chain of Responsibility** |

> **Regra de ouro**: aplique o padrão quando ele resolver claramente um problema. Jamais aplique por aplicar — padrões desnecessários adicionam complexidade.

---

## 5. Qualidade de Código

### Nomenclatura

- **Variáveis e funções**: nomes descritivos que revelam intenção (`getUserById`, não `getUser` ou `fetch`).
- **Booleanos**: prefixe com `is`, `has`, `can`, `should` (`isActive`, `hasPermission`).
- **Evite**: abreviações ambíguas (`mgr`, `tmp`, `data`, `info`, `obj`), números mágicos sem constante nomeada.
- **Consistência**: mantenha o vocabulário do domínio do negócio nos nomes.

### Funções

- Devem fazer **uma coisa** e fazê-la bem.
- Máximo recomendado: **20 linhas**. Se ultrapassar, avalie extração.
- Máximo de **3 parâmetros**; acima disso, use um objeto de configuração/parâmetros.
- Evite flags booleanos como parâmetro — geralmente indicam que a função faz mais de uma coisa.
- Sem efeitos colaterais ocultos.

### Classes e Módulos

- Tamanho focado: se uma classe cresce demais, provavelmente tem mais de uma responsabilidade.
- Prefira **composição sobre herança**.
- Exponha apenas o necessário (princípio do mínimo privilégio).

### Comentários

- **Bom comentário**: explica _por quê_, não _o quê_ (o código já diz o quê).
- **Comentário ruim**: parafraseia o código (`// incrementa i` acima de `i++`).
- Prefira código autodocumentado. Se precisa de comentário para explicar o que faz, refatore o nome.
- Use comentários `TODO:` e `FIXME:` com responsável e data.

---

## 6. Tratamento de Erros

- **Falhe rápido e de forma explícita**: valide entradas nas bordas do sistema.
- **Nunca engula exceções silenciosamente** (`catch (e) {}`).
- Use tipos de erro específicos e significativos, não genéricos.
- Separe erros de **negócio** (esperados, tratáveis) de erros de **sistema** (inesperados, fatais).
- Log deve conter: contexto, causa raiz e dados relevantes para debugging.
- Não exponha detalhes internos (stack traces, queries) em respostas ao cliente.

```
❌ catch (Exception e) { return null; }
✅ catch (UserNotFoundException e) { throw new ApiException(404, "Usuário não encontrado", e); }
```

---

## 7. Testes

### Pirâmide de Testes

```
        /\
       /E2E\        ← Poucos, lentos, caros
      /------\
     /Integração\   ← Moderados
    /------------\
   / Unitários    \ ← Muitos, rápidos, baratos
  /--------------\
```

### Regras

- Todo código de produção deve ter cobertura de testes unitários.
- Testes devem ser **F.I.R.S.T**: Fast, Independent, Repeatable, Self-validating, Timely.
- Use **AAA** (Arrange, Act, Assert) ou **Given/When/Then** para estruturar testes.
- Nomes de testes devem descrever o comportamento: `should_throw_when_user_not_found`.
- Não teste implementação, teste **comportamento**.
- Mocks/stubs apenas para dependências externas (I/O, APIs, banco); não para lógica de negócio interna.
- Código de teste também é código — aplique os mesmos padrões de qualidade.

---

## 8. Arquitetura e Estrutura

### Separação de Camadas

Mantenha separação clara entre:

- **Domínio/Negócio**: regras puras, sem dependência de infraestrutura.
- **Aplicação**: orquestra casos de uso, coordena domínio e infraestrutura.
- **Infraestrutura**: banco de dados, APIs externas, file system, mensageria.
- **Interface**: HTTP controllers, CLI, eventos — adaptadores de entrada.

### Dependências

- A camada de domínio **nunca** depende de infraestrutura.
- Fluxo de dependência: Interface → Aplicação → Domínio ← (implementações de) Infraestrutura.
- Use interfaces/ports no domínio; implemente adapters na infraestrutura.

### Decisões Arquiteturais

- Documente decisões relevantes em **ADR** (Architecture Decision Records).
- Formato mínimo: contexto, decisão, consequências.
- Armazene em `docs/adr/`.

---

## 9. Git e Controle de Versão

### Commits

- Siga **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
- Cada commit deve ser **atômico**: uma mudança lógica coesa.
- Mensagem do commit: imperativo, presente, sem ponto final (`feat: add user authentication`).
- Jamais commite código comentado, `console.log` de debug ou credenciais.

### Branches

- `main`/`master`: sempre estável e deployável.
- Feature branches: `feat/nome-descritivo`.
- Fix branches: `fix/nome-do-problema`.
- Branches de curta duração: merge frequente evita conflitos grandes.

### Pull Requests / Code Review

- PR deve ser pequeno e focado (idealmente < 400 linhas).
- Descreva _o quê_ e _por quê_, não _como_ (o diff já mostra o como).
- Reviewer: questione design, não estilo (estilo é papel do linter).
- Aprovação não é formalidade — é responsabilidade compartilhada.

---

## 10. Segurança (Security by Default)

- **Nunca** armazene segredos no código ou no repositório. Use variáveis de ambiente ou secret managers.
- Valide e sanitize **toda** entrada externa — nunca confie em dados do cliente.
- Use prepared statements / ORM para queries. Nunca concatene SQL com input do usuário.
- Aplique o princípio do menor privilégio em permissões de sistema, banco e APIs.
- Mantenha dependências atualizadas; monitore vulnerabilidades conhecidas.
- Log de segurança: registre acessos, falhas de autenticação e operações sensíveis.

---

## 11. Performance

- **Não otimize prematuramente.** Primeiro faça funcionar corretamente, depois meça, depois otimize.
- Profiling antes de qualquer otimização — dados, não intuição.
- Considere complexidade algorítmica (O(n)) ao escolher estruturas de dados.
- Cuidado com N+1 queries em ORMs — use eager loading quando necessário.
- Cache com propósito: defina TTL, estratégia de invalidação e o que é aceitável estar desatualizado.

---

## 12. Checklist antes de abrir PR

- [ ] O código passa em todos os testes existentes?
- [ ] Adicionei testes para o novo comportamento?
- [ ] Os nomes refletem claramente a intenção?
- [ ] Removi todos os logs de debug e código comentado?
- [ ] Não há segredos, tokens ou senhas no código?
- [ ] Tratamento de erros está adequado?
- [ ] Viola algum princípio SOLID? Se sim, justifique ou refatore.
- [ ] A solução é a mais simples que resolve o problema?
- [ ] A documentação (README, ADR, docstrings) foi atualizada se necessário?

---

## 13. Quando pedir ajuda ou questionar

Se um requisito parece forçar uma violação dos princípios acima, **questione antes de implementar**. Débito técnico consciente e documentado é aceitável; débito técnico acidental e silencioso não é.

Ao encontrar código legado que viola estes princípios: **não piore**. Se o escopo permitir, melhore incrementalmente. Aplique a Regra do Escoteiro: deixe o código melhor do que você encontrou.

---

_Este documento é vivo. Atualize-o conforme o projeto evolui e novos padrões emergem._
