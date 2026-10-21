#!/usr/bin/env python3
"""Этап 1 смыслового поля: разметка пунктов, тегов на фрагментах и связей.

Читает data/index.json и data/docs/<id>.json (как пишет update.py),
пишет data/kg/<id>.json и data/kg/index.json.

Всё правилами, без модели: source="rule". Текст нормы не меняется,
кроме склейки переносов строк внутри абзаца (то, что видит пользователь).

Пакет на документ:
  {id, ver, hash, parts:[{n,title}], points:[{
     n, part, sec, text,
     spans:[{s,e,t}]            t ∈ zapret|iskl|dopusk|usl|ref
     refs:[{s,e,to,kind,type,ctx:[s,e],src}]
     back:[{doc,p,type}]         кто ссылается (внутри базы)
  }], defs:[{term,p,s,e}]}
to: {"doc":id,"p":"2.19.2"} | {"doc":id,"range":["2.25","2.28"]} |
    {"doc":id,"art":"87"} | {"doc":id} (документ целиком) |
    {"ext":"20051121-139","label":"Приказ ... № 139"} (нет в базе)
"""
import json, os, re, sys, hashlib
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
VER = 1

MONTHS = {m: i + 1 for i, m in enumerate(
    'января февраля марта апреля мая июня июля августа сентября октября ноября декабря'.split())}

# ---------- нормализация ----------
LIST_START = re.compile(r'^(?:[а-я]\)|\d+\)|-|—|•|[а-я]\.\s)')

def unwrap(block):
    """Склеивает строки абзаца; новый абзац — у подпунктов «а)», «1)», «-» и после «;», «:», «.»."""
    block = re.sub(r'-{5,}\s*', '\n', block)          # сноски «-----<*>»
    out = []
    for ln in block.split('\n'):
        ln = ln.strip()
        if not ln:
            continue
        if not out:
            out.append(ln); continue
        prev = out[-1]
        if LIST_START.match(ln) or ln.startswith('<*') or prev.endswith((';', ':')) or (prev.endswith('.') and ln[:1].isupper()):
            out.append(ln)
        elif re.search(r'[а-яё]-$', prev) and ln[:1].islower():
            out[-1] = prev[:-1] + ln          # перенос слова
        else:
            out[-1] = prev + ' ' + ln
    return '\n'.join(out).strip()

# ---------- пункты ----------
PT = re.compile(r'(?m)^(\d+(?:\.\d+)*)\.\s+(?=\S)')
APPROVED = re.compile(r'(?mi)^\s*(утвержден[ыао]?|приложение(?:\s+n?\s*\d+)?)\s*$')
ROMAN = re.compile(r'(?m)^([IVXLC]+)\.\s+(.{3,160})$')
SECLINE = re.compile(r'^[А-ЯЁ][^.;:]{3,120}$')

def nxt_ok(prev, cur):
    """Номер следующего пункта правдоподобен: 2.18.16 → 2.19, 1.6 → 2.1, 2.19 → 2.19.1."""
    if prev is None:
        return all(x == 1 for x in cur[1:]) and cur[0] <= 2
    if len(cur) > len(prev) + 1:
        return False
    k = 0
    while k < min(len(cur), len(prev)) and cur[k] == prev[k]:
        k += 1
    if k == len(cur):
        return False                                   # повтор или шаг вверх без увеличения
    if k == len(prev):                                 # вглубь: 2.19 → 2.19.1
        return cur[k] in (1, 2) and len(cur) == k + 1
    return 0 < cur[k] - prev[k] <= 4 and all(x in (0, 1) for x in cur[k + 1:])

ARTL = re.compile(r'(?m)^Статья\s+(\d+(?:\.\d+)*)\.\s*(.*)$')

def split_articles(text):
    ms = list(ARTL.finditer(text))
    pts = []; ch = None
    heads = list(re.finditer(r'(?mi)^Глава\s+([IVXLC]+|\d+)\.?\s*(.*)$', text))
    for i, m in enumerate(ms):
        e = ms[i + 1].start() if i + 1 < len(ms) else len(text)
        raw = text[m.start():e]
        hs = [h for h in heads if h.start() < m.start()]
        ch = ('Глава ' + hs[-1].group(1) + '. ' + hs[-1].group(2).strip()) if hs else None
        cut = re.search(r'(?mi)^Глава\s+(?:[IVXLC]+|\d+)', raw)
        if cut: raw = raw[:cut.start()]
        pts.append({'n': m.group(1), 'part': 0, 'raw': raw, 'ch': ch, 'sec': m.group(2).strip()[:160] or None, 'off': m.start()})
    return [{'n': 0, 'title': 'Статьи'}], pts

def split_points(text):
    if len(ARTL.findall(text)) >= 30:
        return split_articles(text)
    """Режет текст на части (приказ / утверждённые правила / приложения) и пункты."""
    cuts = [0] + [m.start() for m in APPROVED.finditer(text)] + [len(text)]
    parts, points = [], []
    for pi in range(len(cuts) - 1):
        a, b = cuts[pi], cuts[pi + 1]
        body = text[a:b]
        title = 'Приказ' if pi == 0 else (body.strip().split('\n')[0][:80])
        parts.append({'n': pi, 'title': title})
        prev = None; found = []; sub = 0
        for m in PT.finditer(body):
            cur = tuple(int(x) for x in m.group(1).split('.'))
            if nxt_ok(prev, cur):
                found.append((m.start(), m.group(1), sub)); prev = cur
            elif len(found) >= 2 and len(cur) <= 2 and all(x == 1 for x in cur) and len([f for f in found if f[2] == sub]) >= 2:
                sub += 1                                # нумерация началась заново: новый раздел/приложение
                found.append((m.start(), m.group(1), sub)); prev = cur
        for i, (s, num, sb) in enumerate(found):
            e = found[i + 1][0] if i + 1 < len(found) else len(body)
            raw = body[s:e]
            # заголовок следующей главы/раздела, прилипший к хвосту пункта:
            # всё после последней строки с «.;:» — если коротко и с заглавной/римской
            sec_next = None
            lines = raw.rstrip().split('\n')
            j = len(lines)
            while j > 1 and not lines[j - 1].rstrip().endswith(('.', ';', ':')):
                j -= 1
            tail = [x.strip() for x in lines[j:] if x.strip()]
            if tail and j >= 1 and sum(map(len, tail)) < 320 and (ROMAN.match(tail[0]) or tail[0][:1].isupper()):
                sec_next = tail; lines = lines[:j]
            raw = '\n'.join(lines)
            pn = pi if sb == 0 else pi + sb / 100           # 1.01 — второй блок нумерации в части 1
            points.append({'n': num, 'part': pn, 'raw': raw, 'sec_after': sec_next, 'off': a + s})
    # глава (римская) и раздел (заголовок без номера) каждого пункта
    ch = sec = None; last_part = -1
    for p in points:
        if p['part'] != last_part: ch = sec = None; last_part = p['part']
        p['ch'], p['sec'] = ch, sec
        tail = p.pop('sec_after')
        if tail:
            ri = next((i for i, x in enumerate(tail) if ROMAN.match(x)), None)
            if ri is not None:
                rest = tail[ri:]
                k = len(rest)
                if k > 1 and rest[-1][:1].isupper(): k -= 1
                ch = ' '.join(rest[:k]); sec = ' '.join(rest[k:]) or None
            else:
                sec = ' '.join(tail)
    # заголовок главы перед первым пунктом части
    for pi in range(len(cuts) - 1):
        first = next((p for p in points if p['part'] == pi), None)
        if first and not first['ch']:
            head = text[cuts[pi]:first['off']]
            ms = list(ROMAN.finditer(head))
            if ms:
                c = ms[-1].group(1) + '. ' + ms[-1].group(2).strip()
                for p in points:
                    if p['part'] == pi and p['ch'] is None: p['ch'] = c
                    elif p['part'] == pi: break
    return parts, points

# ---------- теги на фрагментах ----------
CL_END = re.compile(r'[;:\n]|\.(?=\s+[А-ЯЁ]|\s*$)')
PRED = r'(?:запрещ|не допуска|допуска|разреша|долж|обязан|выполня|осуществля|производ|обеспечива|устанавлива|применя|не применя|вправе|могут|может|следует|необходимо|экипаж|командир|эксплуатант|воздушное судно|полет)'
TAGS = [
    ('iskl', re.compile(r'за\s+исключением|кроме\s+(?:случаев|тех|того|как)|кроме\b|не\s+распространя\w*|не\s+применя\w*\s+(?:к|в|при|для)|исключение\s+составля\w*', re.I)),
    ('zapret', re.compile(r'(?<![а-яё])(?:запрещ\w*|не\s+допуска\w*|не\s+разреша\w*|не\s+вправе|не\s+должн\w*|не\s+может|не\s+могут|не\s+производ\w*|не\s+выполня\w*)', re.I)),
    ('dopusk', re.compile(r'(?<!не )(?<!не\xa0)\b(?:допуска\w*|разреша\w*|вправе|может\s+(?:быть|выполня|производ|осуществля|использова|принима)\w*|могут\s+(?:быть|выполня|производ|осуществля|использова)\w*)', re.I)),
    ('usl', re.compile(r'при\s+условии|в\s+случае|в\s+случаях|если\b|при\s+наличии|при\s+отсутствии|с\s+соблюдением|при\s+выполнении\s+(?:требований|условий)|только\s+(?:при|после|если)', re.I)),
]
# отсылки — отдельно из refs

def clause_bounds(t, i):
    s = max(t.rfind(c, 0, i) for c in (';', ':', '\n'))
    m = None
    for m2 in re.finditer(r'\.\s+(?=[А-ЯЁ])', t[:i]): m = m2
    s = max(s, m.end() - 1 if m else -1) + 1
    m = CL_END.search(t, i)
    e = m.start() + (1 if m and t[m.start()] in '.;:' else 0) if m else len(t)
    while s < e and t[s] == ' ': s += 1
    return s, e

def lead_clause(t, i, cs, ce):
    """«За исключением …, запрещается» → до запятой перед сказуемым."""
    for m in re.finditer(r',\s+', t[i:ce]):
        rest = t[i + m.end(): i + m.end() + 30].lower()
        if re.match(PRED, rest) and m.start() > 10:
            return cs if cs > i else i, i + m.start()
    return None

def tag_spans(t):
    spans = []
    for typ, rx in TAGS:
        for m in rx.finditer(t):
            if typ == 'dopusk' and re.search(r'не\s*$', t[max(0, m.start() - 4):m.start()]): continue
            cs, ce = clause_bounds(t, m.start())
            if typ in ('iskl', 'usl'):
                lc = lead_clause(t, m.start(), cs, ce)
                if lc and lc[0] <= m.start():
                    s = m.start() if (m.start() - cs) > 0 and t[cs:m.start()].strip(' ,') and typ == 'iskl' and not re.match(r'(?i)за|кроме', t[cs:m.start()].strip()) else cs
                    spans.append({'s': min(s, m.start()), 'e': lc[1], 't': typ}); continue
                if typ == 'iskl' and m.start() > cs + 3:
                    # внутри клаузы: от маркера до конца клаузы
                    spans.append({'s': m.start(), 'e': ce, 't': typ}); continue
            spans.append({'s': cs, 'e': ce, 't': typ})
    # одинаковые клаузы одного типа — одна
    # номер пункта в начале не входит во фрагмент
    pm = re.match(r'^\d+(?:\.\d+)*\.\s+', t)
    if pm:
        for sp in spans:
            if sp['s'] < pm.end(): sp['s'] = pm.end()
    # «За исключением …, запрещается …»: главная клауза начинается после исключения/условия
    leads = [sp for sp in spans if sp['t'] in ('iskl', 'usl')]
    for sp in spans:
        if sp['t'] in ('zapret', 'dopusk'):
            for ld in leads:
                if ld['s'] == sp['s'] and ld['e'] < sp['e'] - 5:
                    sp['s'] = ld['e'] + 1
                    while sp['s'] < sp['e'] and t[sp['s']] in ' ,': sp['s'] += 1
    seen = set(); out = []
    for sp in sorted(spans, key=lambda x: (x['s'], x['e'])):
        k = (sp['s'], sp['e'], sp['t'])
        if k in seen or sp['e'] - sp['s'] < 4: continue
        seen.add(k); out.append(sp)
    return out

# ---------- ссылки ----------
NUM = r'\d+(?:\.\d+)*'
PREF = r'(?:под)?пункт(?:а|е|ом|ами|ах|ов|ы|у|ам)?|п\.|пп\.'
REF = re.compile(r'(?<![а-яё])(?P<kind>' + PREF + r')\s*(?P<list>' + NUM + r'(?:\s*(?:,|и|или|-|—|–)\s*' + NUM + r')*)(?![\d.]*\d)', re.I)
ART = re.compile(r'(?<![а-яё])стат(?:ья|ьи|ье|ьей|ьями|ьях|ей)\s*(?P<list>\d+(?:\.\d+)?(?:\s*(?:,|и|-)\s*\d+(?:\.\d+)?)*)', re.I)
DOCREF = re.compile(r'(?P<kind>[Пп]риказ\w*|[Пп]остановлени\w*|[Фф]едеральн\w+\s+закон\w*|[Рр]аспоряжени\w*|[Уу]каз\w*)[^.;]{0,160}?от\s+(?P<d>\d{1,2})\s+(?P<m>[а-я]+)\s+(?P<y>\d{4})\s*г?\.?\s*(?:N|№)\s*(?P<n>[\dА-Яа-я/-]+)')
DOCREF2 = re.compile(r'от\s+(?P<d>\d{2})\.(?P<m>\d{2})\.(?P<y>\d{4})\s*(?:N|№)\s*(?P<n>[\dА-Яа-я/-]+)')
CHAP = re.compile(r'(?<![а-яё])глав(?:а|ы|е|ой|ам|ами|ах)\s+(?P<ch>[IVXLC]+)\b')
VK = re.compile(r'Воздушн\w+\s+кодекс\w*', re.I)
SELF = re.compile(r'^\W{0,3}(?:настоящ\w+|данн\w+)\s+(?:Правил|Положени|Порядк|Требовани|Приказ|Инструкци|Регламент|Федеральн)', re.I)
SUB = re.compile(r'^\s*(?:,\s*)?(?:подпункт\w*\s+"[а-я]"[^.;]{0,20})')

TYPE_RX = [
    ('red', re.compile(r'\(\s*(?:в\s+ред\.|введен\w*|п\.\s*[\d.]+\s+введен|абзац\s+введен|утратил\w*\s+силу)|(?:исключен\w*|утратил\w*\s+силу)\.\s*-\s|с\s+изменениями,?\s+внесенными|изложить\s+в\s+следующей\s+редакции|внести\s+изменени', re.I)),
    ('iskl', re.compile(r'за\s+исключением|кроме|не\s+распространя|не\s+применя\w*\s+(?:к|в|при|для)', re.I)),
    ('srok', re.compile(r'вступа\w*\s+в\s+силу|действ\w+\s+до|утрачива\w*\s+силу|признать\s+утратившим|со\s+дня', re.I)),
    ('usl', re.compile(r'при\s+условии|в\s+случа\w+|если\b|при\s+наличии|при\s+отсутствии|с\s+соблюдением|при\s+выполнении', re.I)),
    ('raschet', re.compile(r'рассчитыва|расчет|по\s+формуле|определя\w+\s+(?:в\s+соответствии|согласно)', re.I)),
    ('dop', re.compile(r'\bтакже\b|дополнительно|наряду\s+с|помимо|в\s+дополнение', re.I)),
]

def doc_id(d, m, y, n):
    mm = MONTHS.get(m.lower()) if not m.isdigit() else int(m)
    if not mm: return None
    n = n.replace('/', '_')
    n = re.sub(r'[^\dА-Яа-я_-]', '', n).strip('-')
    n2 = re.sub(r'-?ФЗ-?|-?ФКЗ-?|-?р$|-?п$', '', n) or n
    return f'{int(y):04d}{mm:02d}{int(d):02d}-{n2}'

def expand_list(s):
    """'5.57 и 5.58' → ([5.57,5.58], None); '2.25 - 2.28' → ([], ('2.25','2.28'))"""
    toks = re.split(r'\s*(,|и|или|-|—|–)\s*', s)
    nums, rng = [], []
    i = 0
    while i < len(toks):
        if i + 2 < len(toks) and toks[i + 1] in '-—–':
            rng.append((toks[i], toks[i + 2])); i += 3; continue
        if re.fullmatch(NUM, toks[i] or ''): nums.append(toks[i])
        i += 1
    return nums, rng

def sentence(t, i, j):
    s = 0
    for m in re.finditer(r'[.;:\n](?=\s*(?:[А-ЯЁа-я]\)|[А-ЯЁ]|\n|$))', t[:i]): s = m.end()
    m = re.search(r'[;\n]|\.(?=\s+[А-ЯЁ]|\s*$)', t[j:])
    e = j + (m.start() + 1 if m else len(t) - j)
    while s < e and t[s] in ' \n': s += 1
    return s, min(e, len(t))

def link_type(t, ctx_s, ref_s, ref_e, ctx_e):
    before = t[ctx_s:ref_s]; around = t[max(ctx_s, ref_s - 80):min(ctx_e, ref_e + 60)]
    cl = before[-140:]
    for typ, rx in TYPE_RX:
        if typ == 'red' and rx.search(t[max(ctx_s, ref_s - 400):min(ctx_e, ref_e + 40)]): return 'red'
        if typ in ('iskl', 'usl') and rx.search(cl + t[ref_s:ref_e]): return typ
        if typ in ('srok', 'raschet', 'dop') and rx.search(around): return typ
    return 'gen'

def resolve_target(t, j, self_id, base, near_doc):
    tail = t[j:j + 260]
    sub = SUB.match(tail)
    if SELF.match(tail) or SELF.match(tail[sub.end():] if sub else ''):
        return self_id
    m = re.match(r'^[^;.]{0,200}?(?:' + DOCREF.pattern + ')', tail)
    if m:
        did = doc_id(m.group('d'), m.group('m'), m.group('y'), m.group('n'))
        if did: return did
    if re.match(r'^[^;.]{0,120}?' + VK.pattern, tail): return '19970319-60'
    if re.match(r'^[^;.]{0,60}?(?:Федеральн\w+\s+авиационн\w+\s+правил|Правил\s+\w+)', tail) and near_doc:
        return near_doc
    return self_id

def extract_refs(t, self_id, base, labels, cur=None, mode='pt'):
    refs = []
    # отсылки к документам целиком
    for rx in (DOCREF, DOCREF2):
        for m in rx.finditer(t):
            did = doc_id(m.group('d'), m.group('m'), m.group('y'), m.group('n'))
            if not did or did == self_id: continue
            s = m.start('d') - 3 if rx is DOCREF else m.start()
            s = m.start()
            cs, ce = sentence(t, s, m.end())
            lab = re.sub(r'\s+', ' ', m.group(0))[:120]
            to = {'doc': did} if did in base else {'ext': did, 'label': lab}
            refs.append({'s': m.start(), 'e': m.end(), 'to': to, 'kind': 'doc', 'type': link_type(t, cs, m.start(), m.end(), ce), 'ctx': [cs, ce], 'src': 'rule'})
    for m in VK.finditer(t):
        if self_id == '19970319-60': break
        cs, ce = sentence(t, m.start(), m.end())
        refs.append({'s': m.start(), 'e': m.end(), 'to': {'doc': '19970319-60'}, 'kind': 'doc', 'type': link_type(t, cs, m.start(), m.end(), ce), 'ctx': [cs, ce], 'src': 'rule'})
    for m in REF.finditer(t):
        nums, rngs = expand_list(m.group('list'))
        tail_target = resolve_target(t, m.end(), self_id, base, None)
        tgt = tail_target
        cs, ce = sentence(t, m.start(), m.end())
        typ = link_type(t, cs, m.start(), m.end(), ce)
        art = re.match(r'^\s*стат\w+\s+(\d+(?:\.\d+)?)', t[m.end():m.end() + 24])
        local = re.match(r'^\s*настоящ\w+\s+стать', t[m.end():m.end() + 30])
        if art:
            tgt = resolve_target(t, m.end() + art.end(), self_id, base, None)
            if tgt == self_id and mode != 'art':
                tgt = '19970319-60' if re.search(VK.pattern, t[m.end():m.end() + 160]) else 'unknown'
        for n in nums:
            if local and mode == 'art':
                to = {'doc': self_id, 'art': cur, 'p': n, 'local': 1}
            else:
                to = {'doc': tgt, 'p': n} if not art else {'doc': tgt, 'art': art.group(1), 'p': n}
                if tgt not in base: to = {'ext': tgt, 'label': labels.get(tgt, ''), 'p': n} if not art else {'ext': tgt, 'art': art.group(1), 'p': n}
            refs.append({'s': m.start(), 'e': m.end(), 'to': to, 'kind': 'point', 'type': typ, 'ctx': [cs, ce], 'src': 'rule'})
        for a, b in rngs:
            to = {'doc': tgt, 'range': [a, b]} if tgt in base else {'ext': tgt, 'range': [a, b]}
            refs.append({'s': m.start(), 'e': m.end(), 'to': to, 'kind': 'range', 'type': typ, 'ctx': [cs, ce], 'src': 'rule'})
    for m in CHAP.finditer(t):
        tgt = resolve_target(t, m.end(), self_id, base, None)
        cs, ce = sentence(t, m.start(), m.end())
        to = {'doc': tgt, 'ch': m.group('ch')} if tgt in base else {'ext': tgt, 'ch': m.group('ch')}
        refs.append({'s': m.start(), 'e': m.end(), 'to': to, 'kind': 'chap', 'type': link_type(t, cs, m.start(), m.end(), ce), 'ctx': [cs, ce], 'src': 'rule'})
    covered = {(r['s'], r['e']) for r in refs}
    pt_ends = [r['e'] for r in refs if r['kind'] == 'point']
    for m in ART.finditer(t):
        if any(0 <= m.start() - e <= 3 for e in pt_ends): continue      # «пункт 2 статьи 87» уже учтён
        tgt = resolve_target(t, m.end(), self_id, base, None)
        if re.match(r'^\s*настоящ\w+\s+стать|^\s*настоящ\w+\s+Кодекс', t[m.end():m.end() + 30]) and mode == 'art':
            tgt = self_id
        elif tgt == self_id and mode != 'art':
            if not re.search(VK.pattern + r'|60-ФЗ', t[m.end():m.end() + 200]): continue
            tgt = '19970319-60'
        cs, ce = sentence(t, m.start(), m.end())
        nums, rngs = expand_list(m.group('list'))
        for n in nums:
            refs.append({'s': m.start(), 'e': m.end(), 'to': {'doc': tgt, 'art': n} if tgt in base else {'ext': tgt, 'art': n}, 'kind': 'art', 'type': link_type(t, cs, m.start(), m.end(), ce), 'ctx': [cs, ce], 'src': 'rule'})
    # одна ссылка на документ, если по тому же месту уже есть ссылка на пункт этого документа
    pt_docs = {(r['ctx'][0], r['to'].get('doc') or r['to'].get('ext')) for r in refs if r['kind'] != 'doc'}
    refs = [r for r in refs if not (r['kind'] == 'doc' and (r['ctx'][0], r['to'].get('doc') or r['to'].get('ext')) in pt_docs)]
    refs.sort(key=lambda r: (r['s'], r['kind']))
    return refs

# ---------- определения ----------
DEF = re.compile(r'(?m)^([а-яёА-ЯЁ][^\n]{2,110}?)\s+(?:-|—)\s+(?=[а-яё])')

DEF_HEAD = re.compile(r'(?:термин\w*\s+(?:и\s+)?определени\w*|используются\s+следующие\s+(?:основные\s+)?(?:понятия|термины)|применяются\s+следующие\s+(?:понятия|термины)|понимается\s+следующее)[^\n]{0,80}:\s*\n', re.I)
DEF_LINE = re.compile(r'^\s*(?:\d+\)\s*|[а-я]\)\s*)?([«"]?[а-яёА-ЯЁA-Za-z(][^\n]{1,120}?)\s+(?:-|—|–)\s+\S')

def paragraphs(block):
    paras, cur = [], []
    for ln in block.split('\n'):
        ln = ln.strip()
        if not ln: continue
        cur.append(ln)
        if ln.endswith(('.', ';', ':')):
            paras.append(unwrap('\n'.join(cur)).replace('\n', ' ')); cur = []
    if cur: paras.append(unwrap('\n'.join(cur)).replace('\n', ' '))
    return paras

DEF_P = re.compile(r'^(?:\d+\)\s*|[а-я]\)\s*)?([«"]?[а-яёА-ЯЁA-Za-z(][^;:]{1,200}?)\s+(?:-|—|–)\s+(\S.*)$')

def extract_defs(text, points):
    """Определения: блок после «термины и определения:», «используются следующие понятия:».
    Абзац «термин - определение». Храним термин и дословное определение."""
    defs = []
    for h in DEF_HEAD.finditer(text):
        miss = 0
        for para in paragraphs(text[h.end():h.end() + 150000]):
            m = DEF_P.match(para)
            if m and len(m.group(1).split()) <= 16 and m.group(1)[:1].islower() | m.group(1)[:1].isupper():
                defs.append({'term': m.group(1).strip(' "«»'), 'def': m.group(2)}); miss = 0
            else:
                if re.match(r'^(?:[IVX]+\.|\d+(?:\.\d+)*\.\s|Приложение|Сокращения)', para): break
                miss += 1
                if miss >= 3 and not (defs and para[:1].isupper() and len(para) < 400): break
                if miss >= 3: break
    for d in defs:
        for p in points:
            i = p['text'].find(d['term'] + ' -')
            if i < 0: i = p['text'].find(d['term'] + ' —')
            if i >= 0: d['p'] = p['n']; break
    seen = set(); out = []
    for d in defs:
        k = d['term'].lower()
        if k in seen or 'утратил' in k: continue
        seen.add(k); out.append(d)
    return out

# ---------- сборка ----------
def build(only=None):
    idx = json.load(open(os.path.join(DATA, 'index.json')))
    base = {d['id'] for d in idx['docs']}
    labels = {d['id']: d.get('short') or d['title'][:80] for d in idx['docs']}
    out_dir = os.path.join(DATA, 'kg'); os.makedirs(out_dir, exist_ok=True)
    pkg = {}
    for d in idx['docs']:
        if only and d['id'] not in only: continue
        path = os.path.join(DATA, 'docs', d['id'] + '.json')
        if not os.path.exists(path): continue
        text = json.load(open(path))['text']
        parts, pts = split_points(text)
        for p in pts:
            p['text'] = unwrap(p.pop('raw'))
            p.pop('off', None)
            p['spans'] = tag_spans(p['text'])
            p['refs'] = extract_refs(p['text'], d['id'], base, labels, p['n'], 'art' if parts and parts[0]['title'] == 'Статьи' else 'pt')
            for r in p['refs']:
                if r['kind'] != 'doc' or 'ext' in r['to'] or True:
                    p['spans'].append({'s': r['s'], 'e': r['e'], 't': 'ref'})
            uniq = {(x['s'], x['e'], x['t']): x for x in p['spans']}
            p['spans'] = sorted(uniq.values(), key=lambda x: (x['s'], -x['e']))
            p['back'] = []
        mode = 'art' if parts and parts[0]['title'] == 'Статьи' else 'pt'
        pkg[d['id']] = {'id': d['id'], 'ver': VER, 'mode': mode, 'hash': d.get('hash', ''), 'edition': d.get('edition', ''),
                        'parts': parts, 'points': pts, 'defs': extract_defs(text, pts)}
    # обратные ссылки
    pidx = {}
    for i, doc in pkg.items():
        for p in doc['points']:
            if doc.get('mode') == 'art': pidx[(i, 'ст' + p['n'])] = p
            elif (p['part'] > 0 or len(doc['parts']) == 1) and (i, p['n']) not in pidx: pidx[(i, p['n'])] = p
    for i, doc in pkg.items():
        for p in doc['points']:
            for r in p['refs']:
                to = r['to']
                key = None
                if 'doc' in to and 'art' in to: key = (to['doc'], 'ст' + to['art'])
                elif 'doc' in to and 'p' in to: key = (to['doc'], to['p'])
                if key and key in pidx and pidx[key] is not p:
                    tgt = pidx[key]
                    b = {'doc': i, 'p': p['n'], 'type': r['type']}
                    if b not in tgt['back']: tgt['back'].append(b)
                    r['ok'] = 1
    stats = report(pkg, labels)
    for i, doc in pkg.items():
        with open(os.path.join(out_dir, i + '.json'), 'w') as f:
            json.dump(doc, f, ensure_ascii=False, separators=(',', ':'))
    manifest = {'ver': VER, 'docs': {i: {'hash': doc['hash'], 'points': len(doc['points']),
               'bytes': os.path.getsize(os.path.join(out_dir, i + '.json'))} for i, doc in pkg.items()},
               'stats': stats}
    with open(os.path.join(out_dir, 'index.json'), 'w') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    return pkg, stats

def report(pkg, labels):
    st = {'points': 0, 'tagged_points': 0, 'spans': Counter(), 'refs': Counter(), 'ref_kind': Counter(),
          'unresolved_points': 0, 'ext': Counter(), 'per_doc': {}}
    for i, doc in pkg.items():
        n = len(doc['points']); tg = sum(1 for p in doc['points'] if any(s['t'] != 'ref' for s in p['spans']))
        rc = Counter(r['type'] for p in doc['points'] for r in p['refs'])
        st['per_doc'][i] = {'points': n, 'tagged': tg, 'refs': sum(rc.values()), 'types': dict(rc), 'defs': len(doc['defs'])}
        st['points'] += n; st['tagged_points'] += tg
        for p in doc['points']:
            for s in p['spans']: st['spans'][s['t']] += 1
            for r in p['refs']:
                st['refs'][r['type']] += 1; st['ref_kind'][r['kind']] += 1
                if 'ext' in r['to']: st['ext'][r['to']['ext']] += 1
                elif r['kind'] == 'point' and not r.get('ok') and not r['to'].get('local') and r['type'] != 'red': st['unresolved_points'] += 1
    st['spans'] = dict(st['spans']); st['refs'] = dict(st['refs']); st['ref_kind'] = dict(st['ref_kind'])
    st['ext'] = dict(st['ext'].most_common(40))
    return st

if __name__ == '__main__':
    pkg, st = build(set(sys.argv[1:]) or None)
    print(json.dumps({k: v for k, v in st.items() if k != 'per_doc'}, ensure_ascii=False, indent=1))
