import { Module } from '@nestjs/common';
import { EggCategoriesController } from './egg-categories.controller';
import { EggCategoriesService } from './egg-categories.service';

@Module({
  controllers: [EggCategoriesController],
  providers: [EggCategoriesService],
  exports: [EggCategoriesService],
})
export class EggCategoriesModule {}
