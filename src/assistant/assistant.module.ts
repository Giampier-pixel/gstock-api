import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { MovementsModule } from '../movements/movements.module';
import { ProvidersModule } from '../providers/providers.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ProductsService } from '../products/products.service';
import { MovementsService } from '../movements/movements.service';
import { ProvidersService } from '../providers/providers.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { GeminiClient } from './gemini.client';
import { ToolRegistry } from './tools/tool-registry';
import { createProductsTools } from './tools/products.tools';
import { createMovementsTools } from './tools/movements.tools';
import { createProvidersTools } from './tools/providers.tools';
import { createDashboardTools } from './tools/dashboard.tools';

@Module({
  imports: [ProductsModule, MovementsModule, ProvidersModule, DashboardModule],
  controllers: [AssistantController],
  providers: [
    GeminiClient,
    AssistantService,
    {
      provide: ToolRegistry,
      inject: [ProductsService, MovementsService, ProvidersService, DashboardService],
      useFactory: (
        products: ProductsService,
        movements: MovementsService,
        providers: ProvidersService,
        dashboard: DashboardService,
      ) =>
        new ToolRegistry({
          ...createProductsTools(products),
          ...createMovementsTools(movements, products),
          ...createProvidersTools(providers),
          ...createDashboardTools(dashboard),
        }),
    },
  ],
})
export class AssistantModule {}
