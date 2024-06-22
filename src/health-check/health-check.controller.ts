import { Controller, Get } from '@nestjs/common';

@Controller('')
export class HealthCheckController {
  @Get()
  healthCheck() {
    return 'Payment Health check is ok!!';
  }
}
