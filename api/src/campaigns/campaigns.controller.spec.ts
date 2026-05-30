import { Test, TestingModule } from '@nestjs/testing';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignGateway } from '../realtime/campaign.gateway';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CampaignMemberGuard } from '../common/guards/campaign-member.guard';

describe('CampaignsController', () => {
  let controller: CampaignsController;

  const mockService: Partial<CampaignsService> = {
    findAllForUser: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    addCharacter: jest.fn(),
    removeCharacter: jest.fn(),
    getAiGuideState: jest.fn(),
    upsertAiGuideState: jest.fn(),
    getAiEvents: jest.fn(),
    updateAiEvent: jest.fn(),
    addGm: jest.fn(),
    removeGm: jest.fn(),
    getAssets: jest.fn(),
    addAsset: jest.fn(),
    updateAsset: jest.fn(),
    removeAsset: jest.fn(),
    getTracks: jest.fn(),
    addTrack: jest.fn(),
    updateTrack: jest.fn(),
    removeTrack: jest.fn(),
    getSessions: jest.fn(),
    getActiveCombat: jest.fn(),
    createCombat: jest.fn(),
    updateCombat: jest.fn(),
    endCombat: jest.fn(),
    getSceneEvents: jest.fn(),
    addSceneEvent: jest.fn(),
    getStarship: jest.fn(),
    upsertStarship: jest.fn(),
    deleteStarship: jest.fn(),
  };

  const mockGateway = { emit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignsController],
      providers: [
        { provide: CampaignsService, useValue: mockService },
        { provide: CampaignGateway, useValue: mockGateway },
      ],
    })
      // Override guards so they always allow (we're testing controller logic, not auth)
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CampaignMemberGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(CampaignsController);
  });

  describe('findAll', () => {
    it('calls service.findAllForUser with the authenticated user id', async () => {
      (mockService.findAllForUser as jest.Mock).mockResolvedValue([]);
      const req = { user: { id: 'user-1' } };
      await controller.findAll(req);
      expect(mockService.findAllForUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('findOne', () => {
    it('delegates to service.findOne', async () => {
      (mockService.findOne as jest.Mock).mockResolvedValue({ id: 'c1' });
      await controller.findOne('c1');
      expect(mockService.findOne).toHaveBeenCalledWith('c1');
    });
  });

  describe('create', () => {
    it('normalizes co-op type to coop before creating', async () => {
      (mockService.create as jest.Mock).mockResolvedValue({ id: 'c1' });
      const req = { user: { id: 'user-1' } };
      await controller.create(req, { type: 'co-op', name: 'My Campaign' });
      const [, body] = (mockService.create as jest.Mock).mock.calls[0];
      expect(body.type).toBe('coop');
    });

    it('emits updated event via gateway after creation', async () => {
      (mockService.create as jest.Mock).mockResolvedValue({ id: 'c-new' });
      const req = { user: { id: 'user-1' } };
      await controller.create(req, { name: 'New', type: 'solo' });
      expect(mockGateway.emit).toHaveBeenCalledWith('updated', 'c-new', {});
    });
  });

  describe('update', () => {
    it('normalizes co-op type to coop', async () => {
      (mockService.update as jest.Mock).mockResolvedValue({ id: 'c1' });
      await controller.update('c1', { type: 'co-op' });
      const [, body] = (mockService.update as jest.Mock).mock.calls[0];
      expect(body.type).toBe('coop');
    });

    it('emits updated event after update', async () => {
      (mockService.update as jest.Mock).mockResolvedValue({ id: 'c1' });
      await controller.update('c1', { name: 'Updated' });
      expect(mockGateway.emit).toHaveBeenCalledWith('updated', 'c1', {});
    });
  });

  describe('remove', () => {
    it('emits updated event after deletion', async () => {
      (mockService.remove as jest.Mock).mockResolvedValue(undefined);
      await controller.remove('c1');
      expect(mockGateway.emit).toHaveBeenCalledWith('updated', 'c1', {});
    });
  });

  describe('addCharacter', () => {
    it('uses the authenticated user id as the character owner', async () => {
      (mockService.addCharacter as jest.Mock).mockResolvedValue(undefined);
      const req = { user: { id: 'user-1' } };
      await controller.addCharacter(req, 'c1', 'char-1');
      expect(mockService.addCharacter).toHaveBeenCalledWith(
        'c1',
        'user-1',
        'char-1',
      );
    });
  });
});
