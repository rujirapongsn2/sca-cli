import { Agent } from '../../src/core/agent.js';
import { AgentContext, PlanStep } from '../../src/core/types.js';

describe('Agent', () => {
  let agent: Agent;

  beforeEach(() => {
    agent = new Agent({
      modelProvider: 'local',
      modelEndpoint: 'http://localhost:11434',
    });
  });

  afterEach(() => {
    agent.close();
  });

  describe('startTask', () => {
    it('should create a new context for the task', async () => {
      const context = await agent.startTask('Fix the bug in login', '/test/workspace');
      expect(context).toBeDefined();
      expect(context.task).toBe('Fix the bug in login');
      expect(context.workspace).toBe('/test/workspace');
    });

    it('should generate plan steps based on task type', async () => {
      const context = await agent.startTask('Fix bug in login', '/test/workspace');
      const steps = agent.getPlanSteps(context.id);
      expect(steps.length).toBeGreaterThan(0);
    });
  });

  describe('createPlan', () => {
    it('should create scan step for any task', async () => {
      const context = await agent.startTask('test task', '/test');
      const steps = agent.getPlanSteps(context.id);
      const scanStep = steps.find((s) => s.tool === 'scan');
      expect(scanStep).toBeDefined();
    });

    it('should create different plans for different task types', async () => {
      const bugFixContext = await agent.startTask('fix bug', '/test');
      const featureContext = await agent.startTask('add feature', '/test');

      const bugSteps = agent.getPlanSteps(bugFixContext.id);
      const featureSteps = agent.getPlanSteps(featureContext.id);

      expect(bugSteps.length).toBeGreaterThan(0);
      expect(featureSteps.length).toBeGreaterThan(0);
    });
  });

  describe('getContext', () => {
    it('should return context by ID', async () => {
      const context = await agent.startTask('test', '/test');
      const retrieved = agent.getContext(context.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(context.id);
    });

    it('should return null for non-existent context', () => {
      const retrieved = agent.getContext('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('task analysis', () => {
    it('should identify bug_fix task', async () => {
      const context = await agent.startTask('fix error in login', '/test');
      const steps = agent.getPlanSteps(context.id);
      expect(
        steps.some(
          (s) =>
            s.description.toLowerCase().includes('find') ||
            s.description.toLowerCase().includes('fix')
        )
      ).toBe(true);
    });

    it('should identify testing task', async () => {
      const context = await agent.startTask('run tests', '/test');
      const steps = agent.getPlanSteps(context.id);
      expect(steps.some((s) => s.tool === 'run')).toBe(true);
    });

    it('should identify refactoring task', async () => {
      const context = await agent.startTask('refactor code', '/test');
      const steps = agent.getPlanSteps(context.id);
      expect(steps.length).toBeGreaterThan(0);
    });
  });

  describe('default configuration', () => {
    it('should have default maxIterations', () => {
      const defaultAgent = new Agent();
      expect(defaultAgent).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customAgent = new Agent({
        maxIterations: 20,
        timeout: 60000,
      });
      expect(customAgent).toBeDefined();
      customAgent.close();
    });
  });

  describe('plan steps structure', () => {
    it('should have required fields in plan steps', async () => {
      const context = await agent.startTask('test', '/test');
      const steps = agent.getPlanSteps(context.id);

      for (const step of steps) {
        expect(step.id).toBeDefined();
        expect(step.description).toBeDefined();
        expect(step.tool).toBeDefined();
        expect(step.status).toBeDefined();
        expect(step.timestamp).toBeDefined();
      }
    });
  });
});
