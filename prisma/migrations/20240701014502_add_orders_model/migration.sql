-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "idCliente" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL,
    "volume" INTEGER NOT NULL,
    "prazo" TEXT,
    "prioridade" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bairro" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "instrucoesEntrega" TEXT,
    "nomeContato" TEXT NOT NULL,
    "cpfCnpj" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "roteiroId" INTEGER,
    "tenantId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
