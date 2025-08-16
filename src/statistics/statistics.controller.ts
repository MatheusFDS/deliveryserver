import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface ExportFiltersDto {
  startDate: string;
  endDate: string;
  driverId?: string;
  regionId?: string;
  tipo: 'GERAL' | 'MOTORISTAS' | 'REGIOES' | 'TENDENCIAS';
  formato: 'CSV' | 'PDF';
}

@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  async getStatistics(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('driverId') driverId: string = '',
  ) {
    const userId = req.user.userId;

    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date must be provided');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    return this.statisticsService.getStatistics(userId, start, end, driverId);
  }

  @Get('advanced')
  async getAdvancedStatistics(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('driverId') driverId: string = '',
    @Query('regionId') regionId: string = '',
  ) {
    const userId = req.user.userId;

    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date must be provided');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (end < start) {
      throw new BadRequestException('End date cannot be before start date');
    }

    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > 365) {
      throw new BadRequestException('Period cannot exceed 365 days');
    }

    return this.statisticsService.getAdvancedStatistics(
      userId,
      start,
      end,
      driverId,
      regionId,
    );
  }

  @Post('export/csv')
  async exportCSV(
    @Request() req,
    @Body() exportData: ExportFiltersDto,
    @Res() res,
  ) {
    const userId = req.user.userId;

    try {
      const start = new Date(exportData.startDate);
      const end = new Date(exportData.endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException('Invalid date format');
      }

      const statistics = await this.statisticsService.getAdvancedStatistics(
        userId,
        start,
        end,
        exportData.driverId,
        exportData.regionId,
      );

      const csvData = this.generateCSVData(statistics, exportData.tipo);
      const filename = this.generateFilename(
        exportData.tipo,
        start,
        end,
        'csv',
      );

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      res.write('\uFEFF');
      res.end(csvData);
    } catch (error) {
      throw new BadRequestException(
        `Erro ao gerar relatório CSV: ${error.message}`,
      );
    }
  }

  @Post('export/pdf')
  async exportPDF(@Request() req, @Body() exportData: ExportFiltersDto) {
    const userId = req.user.userId;

    try {
      const start = new Date(exportData.startDate);
      const end = new Date(exportData.endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException('Invalid date format');
      }

      const statistics = await this.statisticsService.getAdvancedStatistics(
        userId,
        start,
        end,
        exportData.driverId,
        exportData.regionId,
      );

      const pdfData = this.generatePDFData(statistics, exportData.tipo);
      const filename = this.generateFilename(
        exportData.tipo,
        start,
        end,
        'pdf',
      );

      return {
        success: true,
        data: pdfData,
        filename,
        tipo: exportData.tipo,
        periodo: {
          inicio: start.toISOString().split('T')[0],
          fim: end.toISOString().split('T')[0],
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Erro ao gerar relatório PDF: ${error.message}`,
      );
    }
  }

  private generateCSVData(statistics: any, tipo: string): string {
    const lines: string[] = [];

    switch (tipo) {
      case 'GERAL':
        lines.push('Métrica,Valor');
        lines.push(`Total de Pedidos,${statistics.resumoGeral.totalPedidos}`);
        lines.push(
          `Taxa de Conclusão,%${statistics.resumoGeral.taxaConclusao}`,
        );
        lines.push(
          `Receita Total,R$ ${statistics.resumoGeral.receitaTotal.toFixed(2)}`,
        );
        lines.push(
          `Performance Média,${statistics.resumoGeral.performanceMedia}`,
        );
        lines.push(`Entregas Ativas,${statistics.resumoGeral.entregasAtivas}`);
        lines.push(
          `Taxa de Pagamento,%${statistics.resumoGeral.taxaPagamento}`,
        );
        lines.push(
          `Tempo Médio de Entrega,${statistics.resumoGeral.tempoMedioEntrega}h`,
        );
        lines.push(
          `Pedidos Pendentes,${statistics.resumoGeral.pedidosPendentes}`,
        );
        break;

      case 'MOTORISTAS':
        lines.push(
          'Motorista,Tempo Médio (h),Taxa Sucesso (%),Total Ganhos (R$),Entregas Completas,Entregas Não Completas,Score Performance',
        );
        statistics.performanceMotoristas.forEach((motorista: any) => {
          lines.push(
            [
              motorista.motorista.nome,
              motorista.tempo_medio_entrega,
              motorista.taxa_sucesso,
              motorista.total_ganhos.toFixed(2),
              motorista.entregas_completadas,
              motorista.entregas_nao_completadas,
              motorista.score_performance,
            ].join(','),
          );
        });
        break;

      case 'REGIOES':
        lines.push(
          'Região,Total Pedidos,Receita Total (R$),Tempo Médio (h),Taxa Sucesso (%),Déficit/Superávit (R$)',
        );
        statistics.analiseRegional.forEach((regiao: any) => {
          lines.push(
            [
              regiao.regiao,
              regiao.total_pedidos,
              regiao.receita_total.toFixed(2),
              regiao.tempo_medio_entrega,
              regiao.taxa_sucesso,
              regiao.deficit_superavit.toFixed(2),
            ].join(','),
          );
        });
        break;

      case 'TENDENCIAS':
        lines.push('Data,Pedidos,Receita (R$),Entregas');
        statistics.dadosTemporais.forEach((dia: any) => {
          lines.push(
            [dia.data, dia.pedidos, dia.receita.toFixed(2), dia.entregas].join(
              ',',
            ),
          );
        });
        break;

      default:
        throw new BadRequestException('Tipo de relatório inválido');
    }

    return lines.join('\n');
  }

  private generatePDFData(statistics: any, tipo: string): any {
    const baseData = {
      titulo: this.getTituloRelatorio(tipo),
      periodo: statistics.periodo,
      geradoEm: new Date().toISOString(),
    };

    switch (tipo) {
      case 'GERAL':
        return {
          ...baseData,
          sections: [
            {
              title: 'KPIs Principais',
              type: 'kpis',
              data: statistics.resumoGeral,
            },
            {
              title: 'Top 5 Motoristas',
              type: 'table',
              headers: ['Motorista', 'Score', 'Taxa Sucesso', 'Entregas'],
              data: statistics.performanceMotoristas
                .slice(0, 5)
                .map((m: any) => [
                  m.motorista.nome,
                  m.score_performance,
                  `${m.taxa_sucesso}%`,
                  m.entregas_completadas,
                ]),
            },
            {
              title: 'Top 5 Regiões',
              type: 'table',
              headers: ['Região', 'Pedidos', 'Receita', 'Taxa Sucesso'],
              data: statistics.analiseRegional
                .slice(0, 5)
                .map((r: any) => [
                  r.regiao,
                  r.total_pedidos,
                  `R$ ${r.receita_total.toFixed(2)}`,
                  `${r.taxa_sucesso}%`,
                ]),
            },
          ],
        };

      case 'MOTORISTAS':
        return {
          ...baseData,
          sections: [
            {
              title: 'Performance dos Motoristas',
              type: 'table',
              headers: [
                'Motorista',
                'Score',
                'Tempo Médio',
                'Taxa Sucesso',
                'Ganhos',
                'Entregas',
              ],
              data: statistics.performanceMotoristas.map((m: any) => [
                m.motorista.nome,
                m.score_performance,
                `${m.tempo_medio_entrega}h`,
                `${m.taxa_sucesso}%`,
                `R$ ${m.total_ganhos.toFixed(2)}`,
                `${m.entregas_completadas}/${m.entregas_completadas + m.entregas_nao_completadas}`,
              ]),
            },
          ],
        };

      case 'REGIOES':
        return {
          ...baseData,
          sections: [
            {
              title: 'Análise Regional',
              type: 'table',
              headers: [
                'Região',
                'Pedidos',
                'Receita',
                'Tempo Médio',
                'Taxa Sucesso',
                'Resultado',
              ],
              data: statistics.analiseRegional.map((r: any) => [
                r.regiao,
                r.total_pedidos,
                `R$ ${r.receita_total.toFixed(2)}`,
                `${r.tempo_medio_entrega}h`,
                `${r.taxa_sucesso}%`,
                r.deficit_superavit >= 0
                  ? `+R$ ${r.deficit_superavit.toFixed(2)}`
                  : `-R$ ${Math.abs(r.deficit_superavit).toFixed(2)}`,
              ]),
            },
          ],
        };

      case 'TENDENCIAS':
        return {
          ...baseData,
          sections: [
            {
              title: 'Evolução Temporal',
              type: 'chart',
              chartType: 'line',
              data: {
                labels: statistics.dadosTemporais.map((d: any) => d.data),
                datasets: [
                  {
                    label: 'Pedidos',
                    data: statistics.dadosTemporais.map((d: any) => d.pedidos),
                  },
                  {
                    label: 'Receita',
                    data: statistics.dadosTemporais.map((d: any) => d.receita),
                  },
                  {
                    label: 'Entregas',
                    data: statistics.dadosTemporais.map((d: any) => d.entregas),
                  },
                ],
              },
            },
          ],
        };

      default:
        throw new BadRequestException('Tipo de relatório inválido');
    }
  }

  private getTituloRelatorio(tipo: string): string {
    const titulos = {
      GERAL: 'Relatório Geral de Estatísticas',
      MOTORISTAS: 'Relatório de Performance dos Motoristas',
      REGIOES: 'Relatório de Análise Regional',
      TENDENCIAS: 'Relatório de Tendências Temporais',
    };
    return titulos[tipo] || 'Relatório de Estatísticas';
  }

  private generateFilename(
    tipo: string,
    start: Date,
    end: Date,
    formato: string,
  ): string {
    const tipoMap = {
      GERAL: 'geral',
      MOTORISTAS: 'motoristas',
      REGIOES: 'regioes',
      TENDENCIAS: 'tendencias',
    };

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:-]/g, '');

    return `estatisticas_${tipoMap[tipo]}_${startStr}_${endStr}_${timestamp}.${formato}`;
  }
}
