-- Adicionar uma coluna temporária
ALTER TABLE "Directions" ADD COLUMN "valorDirecao_temp" INTEGER;

-- Copiar os dados convertidos para a nova coluna
UPDATE "Directions" SET "valorDirecao_temp" = CAST("valorDirecao" AS INTEGER);

-- Apagar a coluna antiga
ALTER TABLE "Directions" DROP COLUMN "valorDirecao";

-- Renomear a coluna temporária
ALTER TABLE "Directions" RENAME COLUMN "valorDirecao_temp" TO "valorDirecao";
