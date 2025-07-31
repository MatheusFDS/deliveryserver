-- Adicionar a coluna `name` com um valor padrão temporário
ALTER TABLE "User" ADD COLUMN "name" TEXT DEFAULT 'Default Name';

-- Remover o valor padrão depois de adicionar a coluna
ALTER TABLE "User" ALTER COLUMN "name" DROP DEFAULT;
