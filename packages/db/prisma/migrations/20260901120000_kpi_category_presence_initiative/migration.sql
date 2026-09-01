-- Renomeia em vez de recriar o tipo: RENAME VALUE preserva as linhas existentes,
-- enquanto dropar e recriar o enum exigiria reescrever toda coluna que o usa.
ALTER TYPE "kpi_category" RENAME VALUE 'ATTENDANCE' TO 'PRESENCE';

ALTER TYPE "kpi_category" ADD VALUE 'INITIATIVE';
