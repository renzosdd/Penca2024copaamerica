jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  }
}));

jest.mock('../models/Competition', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn()
}));

jest.mock('../models/Match', () => ({
  countDocuments: jest.fn(),
  insertMany: jest.fn()
}));

const { promises: fs } = require('fs');
const Competition = require('../models/Competition');
const Match = require('../models/Match');
const { ensureWorldCup2026 } = require('../utils/worldcupSeed');

describe('ensureWorldCup2026', () => {
  const fixture = [
    {
      date: '2026-06-11',
      time: '18:00',
      team1: 'Equipo A',
      team2: 'Equipo B',
      competition: 'Mundial 2026',
      group_name: 'Grupo A',
      series: 'Fase de grupos',
      tournament: 'Copa Mundial de la FIFA 2026'
    },
    {
      date: '2026-06-12',
      time: '21:00',
      team1: 'Equipo C',
      team2: 'Equipo D',
      competition: 'Mundial 2026',
      group_name: 'Grupo B',
      series: 'Fase de grupos',
      tournament: 'Copa Mundial de la FIFA 2026'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    fs.readFile.mockResolvedValue(JSON.stringify(fixture));
  });

  it('creates competition and inserts matches when none exist', async () => {
    Competition.findOne.mockResolvedValue(null);
    Match.countDocuments.mockResolvedValue(0);

    const result = await ensureWorldCup2026();

    expect(fs.readFile).toHaveBeenCalled();
    expect(Competition.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Mundial 2026',
      groupsCount: 12,
      integrantsPerGroup: 4,
      qualifiersPerGroup: 2
    }));
    expect(Match.insertMany).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ team1: 'Equipo A', order: 0 }),
      expect.objectContaining({ team1: 'Equipo C', order: 1 })
    ]));
    expect(result).toEqual({ created: true, matchesInserted: true });
  });

  it('updates existing competition and inserts matches when missing', async () => {
    Competition.findOne.mockResolvedValue({
      _id: 'comp-id',
      groupsCount: 10,
      integrantsPerGroup: 3,
      qualifiersPerGroup: 1,
      tournament: null,
      country: null,
      seasonStart: null,
      seasonEnd: null,
      apiSeason: null
    });
    Match.countDocuments.mockResolvedValue(0);

    const result = await ensureWorldCup2026();

    expect(Competition.updateOne).toHaveBeenCalledWith(
      { _id: 'comp-id' },
      expect.objectContaining({ groupsCount: 12, integrantsPerGroup: 4, qualifiersPerGroup: 2 })
    );
    expect(Match.insertMany).toHaveBeenCalled();
    expect(result).toEqual({ created: false, matchesInserted: true });
  });

  it('skips seeding if competition and matches already exist', async () => {
    Competition.findOne.mockResolvedValue({ _id: 'comp-id', groupsCount: 12 });
    Match.countDocuments.mockResolvedValue(10);

    const result = await ensureWorldCup2026();

    expect(fs.readFile).not.toHaveBeenCalled();
    expect(result).toEqual({ created: false, matchesInserted: false });
  });
});
