## Memória do Projeto flowcom

### Configuração de Modelos
- **Status**: ✅ Corrigido
- **Data**: 2026-09-15
- **Problema**: Ao iniciar o projeto, os modelos definidos em `settings.json` não eram carregados
- **Raiz**: Faltava arquivo `.claude/settings.json` no projeto
- **Solução**: Criado `.claude/settings.json` com configuração dos modelos (freecode para Opus, Haiku, Sonnet, Small Fast)
- **Resultado**: Agora o Claude Code carrega automaticamente os modelos corretos ao abrir o projeto

### Próximos Passos
- Adicionar este arquivo ao git para que a configuração persista
