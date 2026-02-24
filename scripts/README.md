# Scripts de Automação

## bump-version.mjs

Script que incrementa automaticamente a versão do projeto a cada commit.

### Como funciona

1. O script é executado automaticamente pelo git hook `pre-commit`
2. Incrementa o patch version (ex: 1.3.0 -> 1.3.1)
3. Atualiza o `package.json` com a nova versão
4. Adiciona o `package.json` ao staging area do git

### Execução manual

Para testar o script manualmente:

```bash
node scripts/bump-version.mjs
```

### Git Hook

O hook está localizado em `.git/hooks/pre-commit` e é executado automaticamente antes de cada commit.

### Formato de versão

O projeto usa o formato semântico: `MAJOR.MINOR.PATCH`

- **MAJOR**: Incrementa quando há mudanças incompatíveis
- **MINOR**: Incrementa quando há novas funcionalidades compatíveis
- **PATCH**: Incrementa automaticamente a cada commit

### Nota

A versão é exibida na sidebar do aplicativo, abaixo do nome do usuário.
