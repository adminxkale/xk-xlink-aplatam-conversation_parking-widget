import { InteractionService } from '../../domain/ports/interaction-service.port';
import { TemplateService } from '../../domain/ports/template-service.port';
// import { MockInteractionService } from '../services/mock-interaction.service';
import { RealInteractionService } from '../services/real-interaction.service';
import { TemplateServiceImpl } from '../services/template.service';

// --- Swap implementations here ---
// const interactionService: InteractionService = new MockInteractionService();
const interactionService: InteractionService = new RealInteractionService();

const templateService: TemplateService = new TemplateServiceImpl();

export function getInteractionService(): InteractionService {
  return interactionService;
}

export function getTemplateService(): TemplateService {
  return templateService;
}
