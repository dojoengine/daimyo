import { describe, test, expect } from '@jest/globals';
import { parseFrontmatter, frontmatterToEntry } from '../../src/services/entries.js';

describe('parseFrontmatter', () => {
  test('parses valid YAML frontmatter', () => {
    const content = `---
id: "42"
title: "StarkChess"
repo_url: "https://github.com/example/stark-chess"
---

# StarkChess
Some content here.`;

    const result = parseFrontmatter(content);
    expect(result).toEqual({
      id: '42',
      title: 'StarkChess',
      repo_url: 'https://github.com/example/stark-chess',
    });
  });

  test('returns null for content without frontmatter', () => {
    const content = `# StarkChess
Just a regular markdown file.`;

    expect(parseFrontmatter(content)).toBeNull();
  });

  test('returns null for malformed YAML', () => {
    const content = `---
id: [invalid: yaml: {
---`;

    expect(parseFrontmatter(content)).toBeNull();
  });

  test('parses multiline folded scalars', () => {
    const content = `---
id: "42"
title: "Test"
summary_short: >
  A short summary that spans
  multiple lines in the YAML.
repo_url: "https://github.com/example/test"
---`;

    const result = parseFrontmatter(content);
    expect(result).not.toBeNull();
    expect(result!.summary_short).toContain('A short summary');
  });
});

describe('frontmatterToEntry', () => {
  const validData: Record<string, unknown> = {
    id: '42',
    emoji: '♟',
    title: 'StarkChess',
    summary_short: 'A chess game.',
    summary_long: 'A detailed chess game description.',
    work_done_short: 'Built during jam.',
    work_done_long: 'Full engine and frontend.',
    repo_url: 'https://github.com/example/stark-chess',
    demo_url: 'https://chess.example.com',
    video_url: 'https://youtube.com/watch?v=abc123',
    team: ['@alice', '@bob'],
    metrics: {
      classification: 'Whole Game',
      team_size: 2,
      dojo_contracts: '4 models, 3 systems',
      jam_commits_pct: 95,
      playability: 'Live',
    },
  };

  test('converts valid frontmatter to Entry', () => {
    const entry = frontmatterToEntry(validData);
    expect(entry).not.toBeNull();
    expect(entry!.id).toBe('42');
    expect(entry!.emoji).toBe('♟');
    expect(entry!.title).toBe('StarkChess');
    expect(entry!.team).toEqual(['@alice', '@bob']);
    expect(entry!.metrics.classification).toBe('Whole Game');
    expect(entry!.metrics.team_size).toBe(2);
    expect(entry!.metrics.playability).toBe('Live');
    expect(entry!.demo_url).toBe('https://chess.example.com');
    expect(entry!.video_url).toBe('https://youtube.com/watch?v=abc123');
  });

  test('returns null when required fields are missing', () => {
    expect(frontmatterToEntry({})).toBeNull();
    expect(frontmatterToEntry({ id: '1' })).toBeNull();
    expect(frontmatterToEntry({ id: '1', title: 'X' })).toBeNull();
    expect(frontmatterToEntry({ id: '1', title: 'X', repo_url: 'url' })).toBeNull();
  });

  test('handles missing optional fields', () => {
    const minimal: Record<string, unknown> = {
      id: '1',
      title: 'Test',
      repo_url: 'https://github.com/example/test',
      metrics: {
        classification: 'Whole Game',
        team_size: 1,
        dojo_contracts: '1 model',
        jam_commits_pct: 100,
        playability: 'None',
      },
    };

    const entry = frontmatterToEntry(minimal);
    expect(entry).not.toBeNull();
    expect(entry!.emoji).toBe('🎮');
    expect(entry!.demo_url).toBeUndefined();
    expect(entry!.video_url).toBeUndefined();
    expect(entry!.team).toEqual([]);
    expect(entry!.summary_short).toBe('');
  });

  test('coerces numeric id to string', () => {
    const data = { ...validData, id: 42 };
    const entry = frontmatterToEntry(data);
    expect(entry!.id).toBe('42');
  });

  test('defaults classification to Whole Game for unknown values', () => {
    const data = {
      ...validData,
      metrics: { ...validData.metrics, classification: 'Unknown' },
    };
    const entry = frontmatterToEntry(data as Record<string, unknown>);
    expect(entry!.metrics.classification).toBe('Whole Game');
  });

  test('handles Feature classification', () => {
    const data = {
      ...validData,
      metrics: { ...validData.metrics, classification: 'Feature' },
    };
    const entry = frontmatterToEntry(data as Record<string, unknown>);
    expect(entry!.metrics.classification).toBe('Feature');
  });

  test('handles Video playability', () => {
    const data = {
      ...validData,
      metrics: { ...validData.metrics, playability: 'Video' },
    };
    const entry = frontmatterToEntry(data as Record<string, unknown>);
    expect(entry!.metrics.playability).toBe('Video');
  });

  test('handles null demo_url and video_url', () => {
    const data = { ...validData, demo_url: null, video_url: null };
    const entry = frontmatterToEntry(data);
    expect(entry!.demo_url).toBeUndefined();
    expect(entry!.video_url).toBeUndefined();
  });
});
