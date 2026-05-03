// Pure artifact generation, parsing, patching, and provider-selection helpers.
// Extracted from desktop-mode.jsx so the desktop component can focus on UI orchestration.

export const getCurrentDateString = () => {
  const now = new Date();
  return now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

export const extractJsonArray = (text) => {
  if (!text || typeof text !== 'string') return null;
  
  let cleaned = text.trim();
  
  // Remove markdown code fences
  cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/gm, '');
  cleaned = cleaned.replace(/\n?```\s*$/gm, '');
  cleaned = cleaned.replace(/```/g, '');
  
  // Try to find JSON array with multiple patterns
  const patterns = [
    /\[\s*\{[\s\S]*?\}\s*(?:,\s*\{[\s\S]*?\}\s*)*\]/,  // Array with objects (non-greedy)
    /\[[\s\S]*\]/,  // Standard array (greedy fallback)
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Try fixing common JSON issues
        let fixed = match[0]
          .replace(/,\s*]/g, ']')  // Remove trailing commas
          .replace(/,\s*}/g, '}');  // Remove trailing commas in objects
        try {
          const fixedParsed = JSON.parse(fixed);
          if (Array.isArray(fixedParsed)) return fixedParsed;
        } catch (e2) {
          continue;
        }
      }
    }
  }
  
  // Try parsing the whole thing
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    // Try fixing and parsing whole thing
    try {
      const fixed = cleaned
        .replace(/,\s*]/g, ']')
        .replace(/,\s*}/g, '}')
        .replace(/'/g, '"');
      const fixedParsed = JSON.parse(fixed);
      if (Array.isArray(fixedParsed)) return fixedParsed;
    } catch (e2) {
      return null;
    }
  }
  
  return null;
};

export const stringSimilarity = (str1, str2) => {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0 || len2 === 0) return 0;
  if (Math.abs(len1 - len2) > Math.max(len1, len2) * 0.5) return 0;
  
  // Simplified similarity check - character overlap ratio
  const set1 = new Set(str1.toLowerCase().split(''));
  const set2 = new Set(str2.toLowerCase().split(''));
  const intersection = [...set1].filter(x => set2.has(x)).length;
  const union = new Set([...set1, ...set2]).size;
  
  return intersection / union;
};

export const extractSignificantAnchors = (pattern) => {
  if (!pattern || typeof pattern !== 'string') return null;
  
  const lines = pattern.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return null;
  
  // Find the most unique/significant lines (prefer lines with IDs, classes, or unique text)
  const scoreLine = (line) => {
    let score = line.length;
    if (line.includes('id="') || line.includes("id='")) score += 50;
    if (line.includes('class="') || line.includes("class='")) score += 30;
    if (line.includes('data-')) score += 40;
    if (line.match(/<\/?[a-z]+[^>]*>/i)) score += 20; // HTML tags
    if (line.includes('function') || line.includes('const ') || line.includes('let ')) score += 25;
    // Penalize very common patterns
    if (line === '<div>' || line === '</div>' || line === '<span>' || line === '</span>') score -= 40;
    return score;
  };
  
  const scoredLines = lines.map((line, idx) => ({ line, idx, score: scoreLine(line) }));
  scoredLines.sort((a, b) => b.score - a.score);
  
  return {
    firstLine: lines[0],
    lastLine: lines[lines.length - 1],
    bestAnchor: scoredLines[0]?.line || lines[0],
    bestAnchorOriginalIndex: scoredLines[0]?.idx || 0,
    totalLines: lines.length,
    allLines: lines
  };
};

export const normalizeForComparison = (text, aggressive = false) => {
  if (!text) return '';
  let result = text;
  // Normalize line endings
  result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Collapse multiple spaces to single (but preserve newlines)
  result = result.replace(/[ \t]+/g, ' ');
  // Trim each line
  result = result.split('\n').map(l => l.trim()).join('\n');
  // Collapse multiple newlines if aggressive
  if (aggressive) {
    result = result.replace(/\n+/g, '\n');
  }
  return result.trim();
};

export const findBestMatch = (html, pattern, threshold = 0.7) => {
  if (!pattern || pattern.length < 3) return null;
  
  // Strategy 1: Exact match (fastest)
  const exactIndex = html.indexOf(pattern);
  if (exactIndex !== -1) {
    return { index: exactIndex, match: pattern, exact: true, strategy: 'exact' };
  }
  
  // Strategy 2: Trimmed pattern match
  const trimmedPattern = pattern.trim();
  if (trimmedPattern !== pattern && trimmedPattern.length > 0) {
    const trimmedIndex = html.indexOf(trimmedPattern);
    if (trimmedIndex !== -1) {
      return { index: trimmedIndex, match: trimmedPattern, exact: false, strategy: 'trimmed' };
    }
  }
  
  // Strategy 3: Line-trimmed match (trim each line but preserve structure)
  const lineTrimmedPattern = pattern.split('\n').map(l => l.trim()).join('\n').trim();
  const lineTrimmedHtml = html.split('\n').map(l => l.trim()).join('\n');
  const lineTrimmedIndex = lineTrimmedHtml.indexOf(lineTrimmedPattern);
  
  if (lineTrimmedIndex !== -1) {
    // Map back to original HTML position
    let originalPos = 0;
    let trimmedPos = 0;
    const htmlLines = html.split('\n');
    let currentLineInOriginal = 0;
    let posInCurrentLine = 0;
    
    // Find the starting position in original HTML
    while (trimmedPos < lineTrimmedIndex && currentLineInOriginal < htmlLines.length) {
      const originalLine = htmlLines[currentLineInOriginal];
      const trimmedLine = originalLine.trim();
      const leadingSpaces = originalLine.length - originalLine.trimStart().length;
      
      if (posInCurrentLine === 0) {
        originalPos += leadingSpaces;
      }
      
      if (posInCurrentLine < trimmedLine.length) {
        originalPos++;
        posInCurrentLine++;
        trimmedPos++;
      } else {
        // Move to next line
        originalPos += (originalLine.length - leadingSpaces - trimmedLine.length) + 1; // +1 for newline
        currentLineInOriginal++;
        posInCurrentLine = 0;
        trimmedPos++; // for the newline in trimmed version
      }
    }
    
    // Find the ending position
    const matchLength = lineTrimmedPattern.length;
    let endOriginalPos = originalPos;
    let matchedTrimmedChars = 0;
    let endLineIdx = currentLineInOriginal;
    let endPosInLine = posInCurrentLine;
    
    while (matchedTrimmedChars < matchLength && endLineIdx < htmlLines.length) {
      const line = htmlLines[endLineIdx];
      const trimmedLine = line.trim();
      const leadingSpaces = line.length - line.trimStart().length;
      
      if (endPosInLine === 0) {
        endOriginalPos += leadingSpaces;
      }
      
      while (endPosInLine < trimmedLine.length && matchedTrimmedChars < matchLength) {
        endOriginalPos++;
        endPosInLine++;
        matchedTrimmedChars++;
      }
      
      if (matchedTrimmedChars < matchLength) {
        endOriginalPos += (line.length - leadingSpaces - trimmedLine.length) + 1;
        endLineIdx++;
        endPosInLine = 0;
        matchedTrimmedChars++; // for newline
      }
    }
    
    return {
      index: originalPos,
      match: html.substring(originalPos, endOriginalPos),
      exact: false,
      strategy: 'line-trimmed'
    };
  }
  
  // Strategy 4: Anchor-based matching for large patterns
  const anchors = extractSignificantAnchors(pattern);
  if (anchors && anchors.totalLines > 3) {
    // Try to find using the best anchor
    const anchorIndex = html.indexOf(anchors.bestAnchor);
    if (anchorIndex !== -1) {
      // Look for first line before the anchor
      const searchStartForFirst = Math.max(0, anchorIndex - pattern.length);
      const regionBeforeAnchor = html.substring(searchStartForFirst, anchorIndex);
      const firstLineInRegion = regionBeforeAnchor.lastIndexOf(anchors.firstLine);
      
      if (firstLineInRegion !== -1 || anchors.bestAnchorOriginalIndex === 0) {
        const actualStart = anchors.bestAnchorOriginalIndex === 0 
          ? anchorIndex 
          : searchStartForFirst + firstLineInRegion;
        
        // Look for last line after the anchor
        const searchEndForLast = Math.min(html.length, anchorIndex + pattern.length * 2);
        const regionAfterAnchor = html.substring(anchorIndex, searchEndForLast);
        const lastLineInRegion = regionAfterAnchor.indexOf(anchors.lastLine);
        
        if (lastLineInRegion !== -1) {
          const actualEnd = anchorIndex + lastLineInRegion + anchors.lastLine.length;
          
          // Validate: check that most anchor lines exist in the found region
          const foundRegion = html.substring(actualStart, actualEnd);
          const foundLines = foundRegion.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          let matchedAnchors = 0;
          for (const anchorLine of anchors.allLines) {
            if (foundLines.some(fl => fl.includes(anchorLine) || anchorLine.includes(fl))) {
              matchedAnchors++;
            }
          }
          
          const matchRatio = matchedAnchors / anchors.totalLines;
          if (matchRatio >= 0.7) {
            return {
              index: actualStart,
              match: foundRegion,
              exact: false,
              strategy: 'anchor-based',
              confidence: matchRatio
            };
          }
        }
      }
    }
  }
  
  // Strategy 5: Normalized whitespace match (collapse spaces, preserve newlines)
  const normalizedPattern = normalizeForComparison(pattern, false);
  const normalizedHtml = normalizeForComparison(html, false);
  const normalizedIndex = normalizedHtml.indexOf(normalizedPattern);
  
  if (normalizedIndex !== -1) {
    // Map back to original positions using character counting
    let originalPos = 0;
    let normalizedPos = 0;
    
    while (normalizedPos < normalizedIndex && originalPos < html.length) {
      const origChar = html[originalPos];
      if (/[ \t]/.test(origChar)) {
        // Skip extra spaces in original
        while (originalPos < html.length && /[ \t]/.test(html[originalPos])) {
          originalPos++;
        }
        normalizedPos++; // Single space in normalized
      } else if (origChar === '\n') {
        // Newlines are preserved
        originalPos++;
        normalizedPos++;
        // Skip leading whitespace on next line
        while (originalPos < html.length && /[ \t]/.test(html[originalPos])) {
          originalPos++;
        }
      } else {
        originalPos++;
        normalizedPos++;
      }
    }
    
    // Now find the end position
    let endOriginalPos = originalPos;
    let matchedNormalizedChars = 0;
    const normalizedPatternLen = normalizedPattern.length;
    
    while (matchedNormalizedChars < normalizedPatternLen && endOriginalPos < html.length) {
      const origChar = html[endOriginalPos];
      if (/[ \t]/.test(origChar)) {
        while (endOriginalPos < html.length && /[ \t]/.test(html[endOriginalPos])) {
          endOriginalPos++;
        }
        matchedNormalizedChars++;
      } else if (origChar === '\n') {
        endOriginalPos++;
        matchedNormalizedChars++;
        while (endOriginalPos < html.length && /[ \t]/.test(html[endOriginalPos])) {
          endOriginalPos++;
        }
      } else {
        endOriginalPos++;
        matchedNormalizedChars++;
      }
    }
    
    return { 
      index: originalPos, 
      match: html.substring(originalPos, endOriginalPos), 
      exact: false,
      strategy: 'normalized'
    };
  }
  
  // Strategy 6: Aggressive whitespace removal (for heavily reformatted content)
  const noWhitespacePattern = pattern.replace(/\s/g, '');
  if (noWhitespacePattern.length >= 20) {
    const noWhitespaceHtml = html.replace(/\s/g, '');
    const noWhitespaceIndex = noWhitespaceHtml.indexOf(noWhitespacePattern);
    
    if (noWhitespaceIndex !== -1) {
      let originalPos = 0;
      let strippedPos = 0;
      while (strippedPos < noWhitespaceIndex && originalPos < html.length) {
        if (!/\s/.test(html[originalPos])) strippedPos++;
        originalPos++;
      }
      
      let endPos = originalPos;
      let matchedChars = 0;
      while (endPos < html.length && matchedChars < noWhitespacePattern.length) {
        if (!/\s/.test(html[endPos])) matchedChars++;
        endPos++;
      }
      
      return {
        index: originalPos,
        match: html.substring(originalPos, endPos),
        exact: false,
        strategy: 'no-whitespace'
      };
    }
  }
  
  // Strategy 7: Progressive line matching (for multi-line patterns)
  const patternLines = pattern.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (patternLines.length > 1) {
    // Find a unique starting line (not just first line)
    let bestStartLine = null;
    let bestStartLineIdx = 0;
    let bestStartScore = 0;
    
    for (let i = 0; i < Math.min(patternLines.length, 5); i++) {
      const line = patternLines[i];
      if (line.length < 5) continue;
      const occurrences = html.split(line).length - 1;
      const uniquenessScore = line.length / (occurrences + 1);
      if (uniquenessScore > bestStartScore) {
        bestStartScore = uniquenessScore;
        bestStartLine = line;
        bestStartLineIdx = i;
      }
    }
    
    if (bestStartLine) {
      const startLineIndex = html.indexOf(bestStartLine);
      if (startLineIndex !== -1) {
        // Work backwards to find actual start
        let actualStart = startLineIndex;
        for (let i = bestStartLineIdx - 1; i >= 0; i--) {
          const prevLine = patternLines[i];
          const searchRegion = html.substring(Math.max(0, actualStart - prevLine.length * 3 - 100), actualStart);
          const prevLineIdx = searchRegion.lastIndexOf(prevLine);
          if (prevLineIdx !== -1) {
            actualStart = Math.max(0, actualStart - prevLine.length * 3 - 100) + prevLineIdx;
          } else {
            break;
          }
        }
        
        // Work forwards to find actual end
        let actualEnd = startLineIndex + bestStartLine.length;
        for (let i = bestStartLineIdx + 1; i < patternLines.length; i++) {
          const nextLine = patternLines[i];
          const searchRegion = html.substring(actualEnd, actualEnd + nextLine.length * 3 + 100);
          const nextLineIdx = searchRegion.indexOf(nextLine);
          if (nextLineIdx !== -1) {
            actualEnd = actualEnd + nextLineIdx + nextLine.length;
          } else {
            break;
          }
        }
        
        if (actualEnd > actualStart) {
          const matchedContent = html.substring(actualStart, actualEnd);
          const matchedLines = matchedContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          
          // Calculate match quality
          let matchedCount = 0;
          for (const pl of patternLines) {
            if (matchedLines.some(ml => ml === pl || ml.includes(pl) || pl.includes(ml))) {
              matchedCount++;
            }
          }
          
          if (matchedCount / patternLines.length >= 0.6) {
            return {
              index: actualStart,
              match: matchedContent,
              exact: false,
              strategy: 'progressive-line',
              matchRatio: matchedCount / patternLines.length
            };
          }
        }
      }
    }
  }
  
  // Strategy 8: HTML tag boundary matching
  const tagMatch = pattern.match(/^(\s*<(\w+)[^>]*>)/);
  if (tagMatch) {
    const openingTag = tagMatch[2];
    const tagPattern = new RegExp(`<${openingTag}[^>]*>`, 'gi');
    const matches = [...html.matchAll(tagPattern)];
    
    for (const match of matches) {
      const tagStart = match.index;
      // Find the corresponding closing tag
      let depth = 1;
      let searchPos = tagStart + match[0].length;
      const closeTagPattern = new RegExp(`<(/?)${openingTag}[^>]*>`, 'gi');
      
      while (depth > 0 && searchPos < html.length) {
        closeTagPattern.lastIndex = searchPos;
        const nextTag = closeTagPattern.exec(html);
        if (!nextTag) break;
        
        if (nextTag[1] === '/') {
          depth--;
        } else {
          depth++;
        }
        searchPos = nextTag.index + nextTag[0].length;
      }
      
      if (depth === 0) {
        const blockContent = html.substring(tagStart, searchPos);
        // Compare normalized versions
        const normalizedBlock = normalizeForComparison(blockContent, true);
        const normalizedPatternAggressive = normalizeForComparison(pattern, true);
        
        if (normalizedBlock === normalizedPatternAggressive || 
            stringSimilarity(normalizedBlock, normalizedPatternAggressive) > 0.85) {
          return {
            index: tagStart,
            match: blockContent,
            exact: false,
            strategy: 'tag-boundary'
          };
        }
      }
    }
  }
  
  // Strategy 9: Substring match for shorter patterns
  if (pattern.length >= 5 && pattern.length <= 100) {
    const substringIndex = html.indexOf(pattern.trim());
    if (substringIndex !== -1) {
      return { index: substringIndex, match: pattern.trim(), exact: false, strategy: 'substring' };
    }
  }
  
  return null;
};

// CRISPR: Apply find-replace operations to HTML
// Preprocesses patterns and uses multiple matching strategies
export const applyFindReplaceOperations = (html, operations) => {
  const results = [];
  let modifiedHtml = html;
  
  // Preprocess function to clean up AI-generated patterns
  const preprocessPattern = (pattern) => {
    if (!pattern || typeof pattern !== 'string') return pattern;
    
    let cleaned = pattern;
    cleaned = cleaned.replace(/\\n/g, '\n');
    cleaned = cleaned.replace(/\\t/g, '\t');
    cleaned = cleaned.replace(/\\"/g, '"');
    cleaned = cleaned.replace(/\\'/g, "'");
    
    // Normalize line endings and whitespace to aid matching
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
    
    return cleaned;
  };
  
  for (const op of operations) {
    if (!op.find || !op.replace) {
      results.push({ 
        ...op, 
        success: false, 
        error: 'Missing find or replace value' 
      });
      continue;
    }
    
    const cleanedFind = preprocessPattern(op.find);
    const cleanedReplace = preprocessPattern(op.replace);
    
    const findResult = findBestMatch(modifiedHtml, cleanedFind);
    
    if (findResult) {
      const before = modifiedHtml.substring(0, findResult.index);
      const after = modifiedHtml.substring(findResult.index + findResult.match.length);
      modifiedHtml = before + cleanedReplace + after;
      
      results.push({
        ...op,
        success: true,
        matchType: findResult.strategy || (findResult.exact ? 'exact' : 'fuzzy'),
        matchedText: findResult.match.substring(0, 60) + (findResult.match.length > 60 ? '...' : ''),
        originalFind: op.find.substring(0, 40) + '...'
      });
    } else {
      const findLower = cleanedFind.toLowerCase().trim();
      const htmlLower = modifiedHtml.toLowerCase();
      
      let hintInfo = null;
      
      const significantPart = findLower.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 30);
      if (significantPart.length > 5) {
        const partialIndex = htmlLower.indexOf(significantPart);
        if (partialIndex !== -1) {
          hintInfo = `Similar text "${significantPart}" found at position ${partialIndex}`;
        }
      }
      
      if (!hintInfo) {
        const tagMatch = cleanedFind.match(/<(\w+)[^>]*>/);
        if (tagMatch) {
          const tagName = tagMatch[1].toLowerCase();
          const tagCount = (htmlLower.match(new RegExp(`<${tagName}[\\s>]`, 'g')) || []).length;
          if (tagCount > 0) {
            hintInfo = `Found ${tagCount} <${tagName}> tags but none matched the pattern exactly`;
          }
        }
      }
      
      results.push({
        ...op,
        success: false,
        error: 'Pattern not found in HTML',
        hint: hintInfo,
        patternPreview: cleanedFind.substring(0, 50) + '...'
      });
    }
  }
  
  return { html: modifiedHtml, results };
};

// CRISPR: Parse find-replace operations from AI response (format-agnostic: XML first, JSON fallback)
export const parseFindReplaceOperations = (aiResponse) => {
  if (!aiResponse || typeof aiResponse !== 'string') {
    return { success: false, operations: [], error: 'Empty or invalid AI response' };
  }

  // Strategy 1: Try XML parsing first (handles <c><from>...<to>... format)
  const xmlResult = parseXmlChanges(aiResponse);
  if (xmlResult && xmlResult.changes && Array.isArray(xmlResult.changes) && xmlResult.changes.length > 0) {
    const validXmlOps = xmlResult.changes.filter(op =>
      op && typeof op === 'object' &&
      typeof op.find === 'string' &&
      typeof op.replace === 'string' &&
      op.find.trim().length > 0
    );
    if (validXmlOps.length > 0) {
      return { success: true, operations: validXmlOps };
    }
  }

  // Strategy 2: Fall back to JSON array parsing
  const jsonArray = extractJsonArray(aiResponse);
  
  if (!jsonArray || jsonArray.length === 0) {
    return { success: false, operations: [], error: 'Could not parse operations from AI response (tried XML and JSON)' };
  }
  
  const validOperations = jsonArray.filter(op => 
    op && typeof op === 'object' && 
    typeof op.find === 'string' && 
    typeof op.replace === 'string' &&
    op.find.trim().length > 0
  );
  
  if (validOperations.length === 0) {
    return { success: false, operations: [], error: 'No valid find-replace operations in response' };
  }
  
  return { success: true, operations: validOperations };
};

export const checkHtmlTagBalance = (html) => {
  if (!html || typeof html !== 'string') return { balanced: true, issues: [] };

  const issues = [];
  const criticalTags = ['div', 'section', 'main', 'nav', 'header', 'footer', 'article', 'aside', 'ul', 'ol', 'table', 'form'];

  for (const tag of criticalTags) {
    const openPattern = new RegExp(`<${tag}[\\s>]`, 'gi');
    const closePattern = new RegExp(`</${tag}\\s*>`, 'gi');
    const openCount = (html.match(openPattern) || []).length;
    const closeCount = (html.match(closePattern) || []).length;
    const diff = openCount - closeCount;

    // Allow small imbalances (self-closing edge cases) but flag significant ones
    if (Math.abs(diff) > 2) {
      issues.push(`<${tag}> severely imbalanced: ${openCount} opens vs ${closeCount} closes (diff: ${diff})`);
    } else if (Math.abs(diff) > 0) {
      // Minor imbalance — warn but don't block
      issues.push(`<${tag}> minor imbalance: ${openCount} opens vs ${closeCount} closes (diff: ${diff})`);
    }
  }

  // Check script block integrity — even 1 mismatch here breaks everything
  const scriptOpens = (html.match(/<script[^>]*>/gi) || []).length;
  const scriptCloses = (html.match(/<\/script>/gi) || []).length;
  if (scriptOpens !== scriptCloses) {
    issues.push(`CRITICAL: <script> tags broken: ${scriptOpens} opens, ${scriptCloses} closes`);
  }

  // Check style block integrity
  const styleOpens = (html.match(/<style[^>]*>/gi) || []).length;
  const styleCloses = (html.match(/<\/style>/gi) || []).length;
  if (styleOpens !== styleCloses) {
    issues.push(`CRITICAL: <style> tags broken: ${styleOpens} opens, ${styleCloses} closes`);
  }

  // Determine severity: CRITICAL issues (script/style) always block, tag imbalances block if severe
  const hasCritical = issues.some(i => i.startsWith('CRITICAL'));
  const hasSevere = issues.some(i => i.includes('severely imbalanced'));

  return {
    balanced: !hasCritical && !hasSevere,
    issues,
    hasCritical,
    hasSevere,
    warningsOnly: issues.length > 0 && !hasCritical && !hasSevere
  };
};

export const validateHtmlStructure = (html) => {
  if (!html || typeof html !== 'string') {
    return { valid: false, error: 'Empty or invalid HTML' };
  }
  
  const lowerHtml = html.toLowerCase();
  
  // Helper to count tag occurrences
  const countOccurrences = (str, pattern) => {
    const matches = str.match(new RegExp(pattern, 'gi'));
    return matches ? matches.length : 0;
  };
  
  const htmlTagCount = countOccurrences(lowerHtml, '<html[\\s>]');
  const closingHtmlCount = countOccurrences(lowerHtml, '</html>');
  const headTagCount = countOccurrences(lowerHtml, '<head[\\s>]');
  const bodyTagCount = countOccurrences(lowerHtml, '<body[\\s>]');
  
  // Check for basic structure presence
  if (htmlTagCount === 0 || closingHtmlCount === 0) {
    return { valid: false, error: 'Missing HTML structure' };
  }
  
  // CRITICAL: Detect merged/duplicate documents
  if (htmlTagCount > 1) {
    return { valid: false, error: 'Multiple HTML documents detected (merged content)' };
  }
  
  if (closingHtmlCount > 1) {
    return { valid: false, error: 'Multiple closing HTML tags detected' };
  }
  
  if (headTagCount > 1) {
    return { valid: false, error: 'Multiple HEAD sections detected (merged documents)' };
  }
  
  if (bodyTagCount > 1) {
    return { valid: false, error: 'Multiple BODY sections detected (merged documents)' };
  }
  
  // Check for content appearing AFTER </html> (sign of corruption/merge)
  const closingHtmlIndex = lowerHtml.lastIndexOf('</html>');
  if (closingHtmlIndex !== -1) {
    const afterHtml = html.substring(closingHtmlIndex + 7).trim();
    // Allow only whitespace after </html>
    if (afterHtml.length > 0 && /[<{a-z]/i.test(afterHtml)) {
      return { valid: false, error: 'Content detected after closing HTML tag' };
    }
  }
  
  // Check for HEAD or BODY presence
  if (headTagCount === 0 && bodyTagCount === 0) {
    return { valid: false, error: 'Incomplete HTML structure - missing HEAD and BODY' };
  }
  
  return { valid: true, error: null };
};

export const retryWithBackoff = async (fn, options = {}) => {
  const { maxRetries = 3, baseDelay = 1000, onRetry = null, retryOnTimeout = true } = options;
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorMessage = (error?.message || '').toLowerCase();
      
      // Broader error detection for AI APIs (transient server errors, rate limits, etc.)
      // Don't retry on clear client errors (4xx) unless it's a rate limit (429)
      const isContextOverflow = 
        errorMessage.includes('context_length') ||
        errorMessage.includes('max_tokens') ||
        errorMessage.includes('maximum context length') ||
        errorMessage.includes('too many tokens') ||
        errorMessage.includes('token limit') ||
        (errorMessage.includes('too long') && errorMessage.includes('token'));

      if (isContextOverflow) {
        const contextError = new Error(`Context length exceeded: ${errorMessage.substring(0, 200)}. Reduce auxiliary context and retry.`);
        contextError.isContextOverflow = true;
        throw contextError;
      }

      const isRetryable = 
        errorMessage.includes('network') ||
        (retryOnTimeout && errorMessage.includes('timeout')) ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('failed to fetch') ||
        errorMessage.includes('aborted') ||
        errorMessage.includes('econnreset') ||
        errorMessage.includes('socket') ||
        errorMessage.includes('500') ||
        errorMessage.includes('502') ||
        errorMessage.includes('503') ||
        errorMessage.includes('504') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('429') ||
        errorMessage.includes('overloaded') ||
        errorMessage.includes('busy');
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      if (onRetry) {
        onRetry(attempt, maxRetries, delay, error);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

export const truncateHtmlForPrompt = (html, maxLength = 12000) => {
  if (!html || html.length <= maxLength) return html;
  
  const lowerHtml = html.toLowerCase();
  
  const headStart = lowerHtml.indexOf('<head');
  const headEnd = lowerHtml.indexOf('</head>');
  const bodyStart = lowerHtml.indexOf('<body');
  const bodyEnd = lowerHtml.indexOf('</body>');
  
  let headSection = '';
  if (headStart !== -1 && headEnd !== -1) {
    headSection = html.substring(headStart, headEnd + 7);
  }
  
  let bodySection = '';
  if (bodyStart !== -1 && bodyEnd !== -1) {
    bodySection = html.substring(bodyStart, bodyEnd + 7);
  }
  
  const headAllowance = Math.min(headSection.length, Math.floor(maxLength * 0.3));
  const bodyAllowance = maxLength - headAllowance - 500;
  
  let truncatedHead = headSection;
  if (headSection.length > headAllowance) {
    truncatedHead = headSection.substring(0, headAllowance) + '\n/* ... styles truncated ... */\n</style>\n</head>';
  }
  
  let truncatedBody = bodySection;
  if (bodySection.length > bodyAllowance) {
    const bodyOpenEnd = bodySection.indexOf('>') + 1;
    const bodyContent = bodySection.substring(bodyOpenEnd, bodySection.length - 7);
    const truncatedContent = bodyContent.substring(0, bodyAllowance - 100);
    const lastTagClose = truncatedContent.lastIndexOf('>');
    const cleanContent = lastTagClose > 0 ? truncatedContent.substring(0, lastTagClose + 1) : truncatedContent;
    truncatedBody = bodySection.substring(0, bodyOpenEnd) + cleanContent + '\n<!-- ... content truncated ... -->\n</body>';
  }
  
  const doctype = html.toLowerCase().startsWith('<!doctype') 
    ? html.substring(0, html.indexOf('>') + 1) + '\n'
    : '<!DOCTYPE html>\n';
  
  return `${doctype}<html lang="en">\n${truncatedHead}\n${truncatedBody}\n</html>`;
};

export const safeExtractJSON = (text) => {
  if (!text || typeof text !== 'string') return null;
  
  // Strategy 1: Find JSON object with balanced braces
  const findBalancedJSON = (str) => {
    let depth = 0;
    let start = -1;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\' && inString) {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      if (inString) continue;
      
      if (char === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && start !== -1) {
          return str.substring(start, i + 1);
        }
      }
    }
    return null;
  };
  
  // Try balanced extraction first
  let jsonStr = findBalancedJSON(text);
  
  // Strategy 2: Fallback to regex if balanced extraction fails
  if (!jsonStr) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
  }
  
  if (!jsonStr) return null;
  
  // Try parsing
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // Strategy 3: Clean common JSON issues and retry
    let cleaned = jsonStr
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/[\x00-\x1F\x7F]/g, ' ');
    
    try {
      return JSON.parse(cleaned);
    } catch (e2) {
      return null;
    }
  }
};

// Tolerant extractor for the Thinklet output shape:
//   {"title":"...","code":"function App(...) {...}","width":N,"height":N}
// LLMs frequently emit unescaped " inside the JSX of the `code` field, which
// breaks JSON.parse. This walks the well-formed envelope (title/width/height)
// and treats whatever sits between `"code":"` and the trailing `","width":N`
// as the raw code body, re-escaping naked quotes so a single JSON.parse can
// then turn `\n`, `\t`, `\\`, etc. into their real characters.
export const extractThinkletAppShape = (text) => {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  // Anchor on the well-formed tail. Width/height are always numeric, so this
  // pattern is unlikely to false-match inside the code body.
  const tailRe = /","width"\s*:\s*(\d+)\s*,\s*"height"\s*:\s*(\d+)\s*\}\s*$/;
  const tailMatch = trimmed.match(tailRe);
  if (!tailMatch) return null;
  const width = Number(tailMatch[1]);
  const height = Number(tailMatch[2]);
  const tailStart = tailMatch.index;

  const codeMarker = '"code":"';
  const codeStart = trimmed.indexOf(codeMarker);
  if (codeStart < 0 || codeStart >= tailStart) return null;
  const rawCode = trimmed.substring(codeStart + codeMarker.length, tailStart);

  // Re-escape any naked " (LLM mistake) while preserving valid \X escapes,
  // then JSON.parse to decode \n \t \r \" \\ \uXXXX etc. in one shot.
  let reEscaped = '';
  for (let i = 0; i < rawCode.length; i++) {
    const ch = rawCode[i];
    if (ch === '\\' && i + 1 < rawCode.length) {
      reEscaped += ch + rawCode[i + 1];
      i++;
      continue;
    }
    if (ch === '"') { reEscaped += '\\"'; continue; }
    reEscaped += ch;
  }
  let code;
  try {
    code = JSON.parse('"' + reEscaped + '"');
  } catch (_) {
    // Fall back to manual decode of the most common escape sequences.
    code = rawCode
      .replace(/\\\\/g, '\u0000')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\"/g, '"')
      .replace(/\u0000/g, '\\');
  }

  // Title sits between `{` and the first `","code":"` — try to recover it,
  // but it's optional; callers can fall back to a hint.
  let title = '';
  const titleRe = /^\s*\{\s*"title"\s*:\s*"((?:[^"\\]|\\.)*)"/;
  const titleMatch = trimmed.match(titleRe);
  if (titleMatch) {
    try { title = JSON.parse('"' + titleMatch[1] + '"'); }
    catch (_) { title = titleMatch[1]; }
  }

  return { title, code, width, height };
};

export const stripMarkdownCodeFences = (text) => {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:[\w-]+)?\s*\n?/i, '');
  cleaned = cleaned.replace(/\n?```\s*$/i, '');
  return cleaned.trim();
};

export const extractCompleteHtmlDocument = (text) => {
  if (!text || typeof text !== 'string') {
    return { html: null, header: '', error: 'Empty response' };
  }

  const cleaned = stripMarkdownCodeFences(text);
  const lower = cleaned.toLowerCase();
  const doctypeIndex = lower.indexOf('<!doctype');
  const htmlIndex = lower.indexOf('<html');
  const startCandidates = [doctypeIndex, htmlIndex].filter(idx => idx >= 0);

  if (startCandidates.length === 0) {
    return { html: null, header: cleaned, error: 'No complete HTML document found in model output' };
  }

  const startIndex = Math.min(...startCandidates);
  const endIndex = lower.lastIndexOf('</html>');

  if (endIndex === -1 || endIndex < startIndex) {
    return {
      html: null,
      header: cleaned.substring(0, startIndex).trim(),
      error: 'HTML document appears truncated before </html>'
    };
  }

  return {
    html: cleaned.substring(startIndex, endIndex + 7).trim(),
    header: cleaned.substring(0, startIndex).trim(),
    trailing: cleaned.substring(endIndex + 7).trim(),
    error: null
  };
};

export const parseArtifactMetaHeader = (text) => {
  if (!text || typeof text !== 'string') return {};

  const cleaned = stripMarkdownCodeFences(text);
  const titleMatch = cleaned.match(/(?:^|\n)\s*TITLE\s*:\s*(.+)/i);
  const widthMatch = cleaned.match(/(?:^|\n)\s*WIDTH\s*:\s*(\d{2,5})/i);
  const heightMatch = cleaned.match(/(?:^|\n)\s*HEIGHT\s*:\s*(\d{2,5})/i);

  const sanitizeTitle = (value) => {
    if (!value || typeof value !== 'string') return '';
    return value.trim().replace(/^["']|["']$/g, '').substring(0, 30);
  };

  return {
    title: sanitizeTitle(titleMatch?.[1] || ''),
    width: widthMatch ? Number.parseInt(widthMatch[1], 10) : undefined,
    height: heightMatch ? Number.parseInt(heightMatch[1], 10) : undefined,
  };
};

export const buildHtmlArtifactErrorDocument = (title, message, rawText = '') => {
  const safeTitle = (title || 'Artifact').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeMessage = (message || 'Could not produce a valid HTML document.').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safePreview = (rawText || '').substring(0, 1200).replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #020617;
      --panel: #0f172a;
      --border: rgba(148, 163, 184, 0.22);
      --text: #e2e8f0;
      --muted: #94a3b8;
      --danger: #fb7185;
    }
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; }
    body {
      display: grid;
      place-items: center;
      padding: 24px;
      background:
        radial-gradient(circle at top, rgba(59, 130, 246, 0.2), transparent 45%),
        linear-gradient(180deg, #020617 0%, #0f172a 100%);
      color: var(--text);
      font-family: Inter, system-ui, sans-serif;
    }
    .card {
      width: min(760px, 100%);
      padding: 24px;
      border-radius: 20px;
      border: 1px solid var(--border);
      background: rgba(15, 23, 42, 0.92);
      box-shadow: 0 24px 64px rgba(2, 6, 23, 0.45);
    }
    h1 {
      margin: 0 0 8px;
      font-size: 24px;
      line-height: 1.1;
    }
    p {
      margin: 0;
      color: var(--muted);
      line-height: 1.6;
    }
    .badge {
      display: inline-flex;
      margin-bottom: 14px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(251, 113, 133, 0.12);
      color: #fda4af;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    pre {
      margin: 18px 0 0;
      max-height: 320px;
      overflow: auto;
      padding: 16px;
      border-radius: 14px;
      border: 1px solid rgba(148, 163, 184, 0.16);
      background: rgba(2, 6, 23, 0.82);
      color: #cbd5e1;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <section class="card">
    <div class="badge">Generation Error</div>
    <h1>${safeTitle}</h1>
    <p>${safeMessage}</p>
    ${safePreview ? `<pre>${safePreview}</pre>` : ''}
  </section>
</body>
</html>`;
};

export const parseGeneratedHtmlArtifact = (rawText, options = {}) => {
  const fallbackTitle = (options.fallbackTitle || 'Artifact').substring(0, 30);
  const fallbackWidth = options.fallbackWidth || 520;
  const fallbackHeight = options.fallbackHeight || 380;

  let title = fallbackTitle;
  let width = fallbackWidth;
  let height = fallbackHeight;
  let htmlSource = '';
  let parser = 'raw-html';

  const jsonParsed = safeExtractJSON(rawText);
  if (jsonParsed && typeof jsonParsed === 'object') {
    title = (jsonParsed.title || title || '').toString().substring(0, 30) || fallbackTitle;
    if (Number.isFinite(jsonParsed.width)) width = Number(jsonParsed.width);
    if (Number.isFinite(jsonParsed.height)) height = Number(jsonParsed.height);
    const possibleHtml = [jsonParsed.content, jsonParsed.html, jsonParsed.document, jsonParsed.code]
      .find(value => typeof value === 'string' && value.trim().length > 0);
    if (possibleHtml) {
      htmlSource = possibleHtml;
      parser = 'json';
    }
  }

  let headerMeta = {};
  if (!htmlSource) {
    const extracted = extractCompleteHtmlDocument(rawText);
    if (!extracted.html) {
      return {
        success: false,
        title,
        width,
        height,
        error: extracted.error || 'No HTML document found',
        parser
      };
    }
    headerMeta = parseArtifactMetaHeader(extracted.header);
    htmlSource = extracted.html;
    parser = extracted.header ? 'header' : 'raw-html';
  } else {
    const extracted = extractCompleteHtmlDocument(htmlSource);
    if (!extracted.html) {
      return {
        success: false,
        title,
        width,
        height,
        error: extracted.error || 'HTML document appears truncated',
        parser
      };
    }
    htmlSource = extracted.html;
  }

  if (headerMeta.title) title = headerMeta.title;
  if (Number.isFinite(headerMeta.width)) width = headerMeta.width;
  if (Number.isFinite(headerMeta.height)) height = headerMeta.height;

  if (title === fallbackTitle) {
    const titleTagMatch = htmlSource.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleTagMatch?.[1]) {
      title = titleTagMatch[1].trim().substring(0, 30) || fallbackTitle;
    }
  }

  const cleanResult = cleanAndValidateHtml(htmlSource);
  if (!cleanResult.success || !cleanResult.html) {
    return {
      success: false,
      title,
      width,
      height,
      error: cleanResult.error || 'Generated HTML failed validation',
      parser
    };
  }

  const tagBalance = checkHtmlTagBalance(cleanResult.html);
  if (!tagBalance.balanced && !tagBalance.warningsOnly) {
    return {
      success: false,
      title,
      width,
      height,
      error: tagBalance.issues?.[0] || 'Generated HTML failed structural validation',
      parser
    };
  }

  return {
    success: true,
    title,
    width,
    height,
    parser,
    content: prettifyHtml(cleanResult.html),
    warnings: tagBalance.issues || []
  };
};

export const sanitizeHtmlOutput = (html) => {
  if (!html || typeof html !== 'string') return html;
  
  let sanitized = html.trim();
  
  // Remove markdown code fences if present
  sanitized = sanitized.replace(/^```(?:html|HTML)?\s*\n?/gm, '');
  sanitized = sanitized.replace(/\n?```\s*$/gm, '');
  sanitized = sanitized.replace(/```/g, '');
  
  // Find the FIRST </html> tag and truncate everything after it
  const lowerSanitized = sanitized.toLowerCase();
  const closingHtmlIndex = lowerSanitized.indexOf('</html>');
  if (closingHtmlIndex !== -1) {
    sanitized = sanitized.substring(0, closingHtmlIndex + 7);
  }
  
  // Remove any content before <!DOCTYPE or <html
  const doctypeIndex = lowerSanitized.indexOf('<!doctype');
  const htmlIndex = lowerSanitized.indexOf('<html');
  const startIndex = doctypeIndex >= 0 ? doctypeIndex : htmlIndex;
  
  if (startIndex > 0) {
    sanitized = sanitized.substring(startIndex);
  }
  
  return sanitized.trim();
};

const unwrapXmlCdata = (value = '') => {
  const text = String(value ?? '');
  const match = text.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return match ? match[1] : text;
};

const stripPatchEdgeNewlines = (value = '') => (
  unwrapXmlCdata(value).replace(/^\s*\n/, '').replace(/\n\s*$/, '')
);

const readXmlTagContent = (source, tagName, searchStart = 0) => {
  if (!source || !tagName) return null;
  const openTag = `<${tagName}>`;
  const closeTag = `</${tagName}>`;
  const openStart = source.indexOf(openTag, searchStart);
  if (openStart === -1) return null;

  const contentStart = openStart + openTag.length;
  const leading = source.slice(contentStart).match(/^\s*<!\[CDATA\[/);
  if (leading) {
    const cdataStart = contentStart + leading[0].indexOf('<![CDATA[');
    const cdataEnd = source.indexOf(']]>', cdataStart + 9);
    if (cdataEnd !== -1) {
      const closeStart = source.indexOf(closeTag, cdataEnd + 3);
      if (closeStart !== -1) {
        return {
          openStart,
          contentStart,
          end: closeStart,
          after: closeStart + closeTag.length,
          content: source.substring(contentStart, closeStart),
        };
      }
    }
  }

  const closeStart = source.indexOf(closeTag, contentStart);
  if (closeStart === -1) return null;
  return {
    openStart,
    contentStart,
    end: closeStart,
    after: closeStart + closeTag.length,
    content: source.substring(contentStart, closeStart),
  };
};

export const parseXmlChanges = (text) => {
  if (!text) return { thinking: '', changes: [] };
  
  let contentToParse = text;
  let thinking = "Applying changes...";

  contentToParse = contentToParse.replace(/^```(?:xml|html|jsx|js|javascript)?\s*/i, "");
  contentToParse = contentToParse.replace(/\s*```$/i, "");

  // Handle JSON-wrapped responses — ALWAYS try if starts with {
  // Critical fix: removed `!contentToParse.includes('<c')` guard because
  // when XML is embedded inside JSON string values, it naturally contains '<c'
  // which caused the unwrap to be skipped, silently dropping all changes.
  if (contentToParse.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(contentToParse);
      if (parsed.thinking) thinking = parsed.thinking;
      // Try multiple possible field names the AI might use
      const responseContent = parsed.response || parsed.content || parsed.output || parsed.result || parsed.changes_xml || parsed.xml;
      if (typeof responseContent === 'string' && responseContent.length > 10) {
        contentToParse = responseContent;
      }
    } catch (e) {
      // Not valid JSON — fall through to raw XML parsing
    }
  }

  // Handle markdown fences that appear after thinking text (mid-text fences)
  // AI sometimes outputs: "Thinking...\n\n```xml\n<c>...\n```\n\n<meta>..."
  if (!contentToParse.includes('<c') && contentToParse.includes('```')) {
    const fenceMatch = contentToParse.match(/```(?:xml|html|jsx|js)?\s*\n([\s\S]*?)```/);
    if (fenceMatch && fenceMatch[1].includes('<c')) {
      const fenceStart = contentToParse.indexOf(fenceMatch[0]);
      const thinkingBefore = contentToParse.substring(0, fenceStart).trim();
      if (thinkingBefore) thinking = thinkingBefore;
      contentToParse = fenceMatch[1];
    }
  } else if (contentToParse.includes('<c') && contentToParse.includes('```')) {
    // Fences wrapping the XML blocks — strip them but preserve surrounding text
    const fenceMatch = contentToParse.match(/```(?:xml|html|jsx|js)?\s*\n([\s\S]*?)```/);
    if (fenceMatch && fenceMatch[1].includes('<c')) {
      const fenceStart = contentToParse.indexOf(fenceMatch[0]);
      const thinkingBefore = contentToParse.substring(0, fenceStart).trim();
      const afterFence = contentToParse.substring(fenceStart + fenceMatch[0].length).trim();
      if (thinkingBefore && !thinking) thinking = thinkingBefore;
      contentToParse = fenceMatch[1] + (afterFence ? '\n' + afterFence : '');
    }
  }

  // 1. Extract Thinking (Everything before first <c tag)
  const firstTagIndex = contentToParse.toLowerCase().indexOf('<c');
  if (firstTagIndex > 0) {
    thinking = contentToParse.substring(0, firstTagIndex).trim();
    thinking = thinking.replace(/^Phase \d+:/i, '').trim();
  }
  
  // 2. Extract meta block (small, regex is fine here)
  let meta = {};
  const metaRegex = /<meta>([\s\S]*?)<\/meta>/i;
  const metaMatch = contentToParse.match(metaRegex);
  if (metaMatch) {
    try {
      meta = JSON.parse(metaMatch[1].trim());
    } catch (e) {
      const extracted = safeExtractJSON(metaMatch[1]);
      if (extracted) meta = extracted;
    }
  }

  // 3. State Machine Parser for <c> blocks — O(N) time, no catastrophic backtracking
  // Handles massive multi-thousand-line <to> blocks and truncated LLM responses
  const changes = [];
  let currentIndex = 0;
  
  while (true) {
    const cStart = contentToParse.indexOf('<c', currentIndex);
    if (cStart === -1) break;
    
    const fromBlock = readXmlTagContent(contentToParse, 'from', cStart);
    if (!fromBlock) break;

    const toStart = contentToParse.indexOf('<to>', fromBlock.after);
    if (toStart === -1) break;
    
    const toBlock = readXmlTagContent(contentToParse, 'to', fromBlock.after);
    const cEnd = toBlock ? contentToParse.indexOf('</c>', toBlock.after) : -1;

    let findContent = fromBlock.content;
    let replaceContent = "";
    
    if (toBlock) {
      // Normal case: complete <to>...</to> block
      replaceContent = toBlock.content;
      currentIndex = cEnd !== -1 ? cEnd + 4 : toBlock.after;
    } else {
      // LLM was cut off mid-response! Harvest everything after <to> tag
      replaceContent = contentToParse.substring(toStart + 4);
      // Try to clean up any trailing partial tags
      const lastValidClose = replaceContent.lastIndexOf('>');
      if (lastValidClose > replaceContent.length * 0.9) {
        replaceContent = replaceContent.substring(0, lastValidClose + 1);
      }
      currentIndex = contentToParse.length; // Exit after this
    }

    // Clean leading/trailing newlines but preserve internal whitespace
    let cleanFind = stripPatchEdgeNewlines(findContent);
    let cleanReplace = stripPatchEdgeNewlines(replaceContent);

    if (cleanFind.length > 0 || cleanReplace.length > 0) {
      changes.push({
        description: `Change ${changes.length + 1}`,
        find: cleanFind,
        replace: cleanReplace
      });
    }
    
    // Safety: if we didn't advance, force advance to prevent infinite loop
    if (currentIndex <= cStart) {
      currentIndex = cStart + 2;
    }
  }
  
  // Rescue pass: If state machine found 0 changes, try to extract JSON-trapped XML
  if (changes.length === 0 && contentToParse.length > 50) {
    // Check if the original text might contain JSON-wrapped XML
    const jsonObj = safeExtractJSON(contentToParse);
    if (jsonObj) {
      const possibleXmlFields = ['response', 'content', 'output', 'result', 'xml', 'changes', 'code', 'modifications'];
      for (const field of possibleXmlFields) {
        if (typeof jsonObj[field] === 'string' && (jsonObj[field].includes('<from>') || jsonObj[field].includes('<c'))) {
          // Unescape JSON string and re-parse recursively
          const unescaped = jsonObj[field]
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '\r')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
          // Use a simple inline parse to avoid infinite recursion
          let rescueIndex = 0;
          while (true) {
            const rescueFrom = readXmlTagContent(unescaped, 'from', rescueIndex);
            if (!rescueFrom) break;
            const rescueToStart = unescaped.indexOf('<to>', rescueFrom.after);
            if (rescueToStart === -1) break;
            const rescueTo = readXmlTagContent(unescaped, 'to', rescueFrom.after);
            if (!rescueTo) {
              // Truncated — harvest what we can
              const partialTo = unescaped.substring(rescueToStart + 4);
              if (partialTo.length > 0) {
                changes.push({
                  description: `Rescued Change ${changes.length + 1}`,
                  find: stripPatchEdgeNewlines(rescueFrom.content),
                  replace: stripPatchEdgeNewlines(partialTo)
                });
              }
              break;
            }
            changes.push({
              description: `Rescued Change ${changes.length + 1}`,
              find: stripPatchEdgeNewlines(rescueFrom.content),
              replace: stripPatchEdgeNewlines(rescueTo.content)
            });
            rescueIndex = rescueTo.after;
          }
          if (changes.length > 0) {
            if (jsonObj.thinking && !thinking) thinking = jsonObj.thinking;
            break;
          }
        }
      }
    }
  }

  return { thinking, changes, mode: meta.mode || 'interactive', ...meta };
};

// Parse Thinklet line-range CRISPR blocks: <c><lines>N-M</lines><to>...</to></c>
// Tolerant of: JSON wrapping, markdown fences, HTML entities, attribute-form
// (<c lines="N-M">), single-line ranges (<lines>N</lines>), alternate separators
// (-, –, —, .., :, " to ", "~"), whitespace inside tags, and truncated final blocks.
// Returns an array of { start, end, replacement } in source order, or [].
export const parseLineBlocks = (raw, maxLines = Infinity) => {
  if (!raw || typeof raw !== 'string') return [];

  let text = raw;

  // 1. Unwrap JSON if present
  try {
    let decoded = JSON.parse(text);
    while (typeof decoded === 'string') decoded = JSON.parse(decoded);
    if (decoded && typeof decoded === 'object') {
      const fields = ['response', 'content', 'output', 'result', 'text', 'code', 'xml', 'changes', 'patches', 'modifications'];
      for (const f of fields) {
        if (typeof decoded[f] === 'string' && decoded[f].includes('<c')) {
          text = decoded[f]
            .replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r')
            .replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          break;
        }
      }
    }
  } catch {}

  // 2. Strip wrapping markdown fences
  const fence = text.match(/```(?:xml|html|jsx|js|javascript|tsx|ts)?\s*\n([\s\S]*?)```/);
  if (fence && fence[1].includes('<c')) text = fence[1];

  // 3. Decode HTML entities
  text = text
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

  // 4. Normalize tag whitespace ('< c >', '<c \n', etc.)
  text = text
    .replace(/<\s+c(\s|>)/gi, '<c$1')
    .replace(/<\s*\/\s*c\s*>/gi, '</c>')
    .replace(/<\s+lines\s*>/gi, '<lines>')
    .replace(/<\s*lines\s+>/gi, '<lines>')
    .replace(/<\s*\/\s*lines\s*>/gi, '</lines>')
    .replace(/<\s+to\s*>/gi, '<to>')
    .replace(/<\s*to\s+>/gi, '<to>')
    .replace(/<\s*\/\s*to\s*>/gi, '</to>');

  // Range parser — accepts "N", "N-M", "N to M", "N..M", "N:M", "N,M", en/em-dashes, "~"
  const parseRange = (s) => {
    if (!s) return null;
    const cleaned = s.replace(/[–—]/g, '-').trim();
    const single = cleaned.match(/^\s*(\d+)\s*$/);
    if (single) {
      const n = parseInt(single[1], 10);
      return { start: n, end: n };
    }
    const m = cleaned.match(/^\s*(\d+)\s*(?:-|\.\.|:|to|~|,)\s*(\d+)\s*$/i);
    if (!m) return null;
    return { start: parseInt(m[1], 10), end: parseInt(m[2], 10) };
  };

  const blocks = [];
  let cursor = 0;

  while (cursor < text.length) {
    // Find next <c> or <c ...> opening
    let cOpen = -1;
    for (let i = cursor; i < text.length - 1; i++) {
      if (text[i] === '<' && (text[i + 1] === 'c' || text[i + 1] === 'C')) {
        const after = text[i + 2];
        if (after === '>' || after === ' ' || after === '\n' || after === '\t') {
          cOpen = i;
          break;
        }
      }
    }
    if (cOpen === -1) break;

    // End of opening tag
    const cTagEnd = text.indexOf('>', cOpen);
    if (cTagEnd === -1) break;
    const cOpenTag = text.substring(cOpen, cTagEnd + 1);

    // Look for <lines>...</lines> first; fall back to lines="..." attribute on <c>
    let rangeStr = null;
    const linesStart = text.indexOf('<lines>', cTagEnd);
    const nextC = text.indexOf('<c', cTagEnd + 1);
    if (linesStart !== -1 && (nextC === -1 || linesStart < nextC)) {
      const linesEnd = text.indexOf('</lines>', linesStart + 7);
      if (linesEnd !== -1) rangeStr = text.substring(linesStart + 7, linesEnd);
    }
    if (!rangeStr) {
      const attr = cOpenTag.match(/\blines\s*=\s*"([^"]+)"/i) || cOpenTag.match(/\blines\s*=\s*'([^']+)'/i);
      if (attr) rangeStr = attr[1];
    }

    // Locate <to>...</to>
    const toStart = text.indexOf('<to>', cTagEnd);
    if (toStart === -1 || (nextC !== -1 && toStart > nextC && rangeStr === null)) {
      // No <to> for this block — advance and keep scanning
      cursor = cTagEnd + 1;
      continue;
    }
    if (toStart === -1) break;

    const toEnd = text.indexOf('</to>', toStart + 4);
    let replacement;
    let advanceTo;
    if (toEnd !== -1) {
      replacement = text.substring(toStart + 4, toEnd);
      const cClose = text.indexOf('</c>', toEnd + 5);
      advanceTo = cClose !== -1 ? cClose + 4 : toEnd + 5;
    } else {
      // Truncated tail — harvest what's there, but only if it ends near a closing tag
      const tail = text.substring(toStart + 4);
      const lastClose = tail.lastIndexOf('>');
      replacement = lastClose > tail.length * 0.9 ? tail.substring(0, lastClose + 1) : tail;
      advanceTo = text.length;
    }

    const range = parseRange(rangeStr);
    if (range && range.start >= 1 && range.end >= range.start && range.end <= maxLines + 1) {
      // Strip a single leading/trailing newline (preserve internal whitespace)
      const cleaned = stripPatchEdgeNewlines(replacement);
      blocks.push({ start: range.start, end: range.end, replacement: cleaned });
    }

    if (advanceTo <= cursor) advanceTo = cursor + 1;
    cursor = advanceTo;
  }

  return blocks;
};

export const parseCrisprBlocks = (raw) => {
  if (!raw || typeof raw !== 'string') return null;

  let text = raw;

  try {
    let decoded = JSON.parse(text);
    while (typeof decoded === 'string') {
      decoded = JSON.parse(decoded);
    }
    if (typeof decoded === 'object' && decoded !== null) {
      const responseFields = ['response', 'content', 'output', 'result', 'code', 'xml', 'changes', 'patches', 'modifications'];
      for (const field of responseFields) {
        if (typeof decoded[field] === 'string' && (decoded[field].includes('<from>') || decoded[field].includes('<c'))) {
          text = decoded[field].replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          break;
        }
      }
    }
  } catch (e) {}

  const fenceMatch = text.match(/```(?:\w+)?\s*\n([\s\S]*?)```/);
  if (fenceMatch && (fenceMatch[1].includes('<from>') || fenceMatch[1].includes('<c'))) {
    text = fenceMatch[1];
  }

  text = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

  text = text.replace(/<\s+c\s*>/gi, '<c>');
  text = text.replace(/<\s*c\s+>/gi, '<c>');
  text = text.replace(/<\s*\/\s*c\s*>/gi, '</c>');
  text = text.replace(/<\s+from\s*>/gi, '<from>');
  text = text.replace(/<\s*from\s+>/gi, '<from>');
  text = text.replace(/<\s*\/\s*from\s*>/gi, '</from>');
  text = text.replace(/<\s+to\s*>/gi, '<to>');
  text = text.replace(/<\s*to\s+>/gi, '<to>');
  text = text.replace(/<\s*\/\s*to\s*>/gi, '</to>');

  const blocks = [];
  let cursor = 0;

  while (cursor < text.length) {
    let cPos = text.indexOf('<c>', cursor);
    if (cPos === -1) {
      const cAttr = text.indexOf('<c ', cursor);
      if (cAttr === -1) {
        const cNewline = text.indexOf('<c\n', cursor);
        if (cNewline === -1) break;
        cPos = cNewline;
      } else {
        cPos = cAttr;
      }
    }

    const fromBlock = readXmlTagContent(text, 'from', cPos);
    if (!fromBlock) break;

    const toStart = text.indexOf('<to>', fromBlock.after);
    if (toStart === -1) break;

    const toBlock = readXmlTagContent(text, 'to', fromBlock.after);

    let fromContent, toContent;

    if (toBlock) {
      fromContent = fromBlock.content;
      toContent = toBlock.content;
      const cEnd = text.indexOf('</c>', toBlock.after);
      cursor = cEnd !== -1 ? cEnd + 4 : toBlock.after;
    } else {
      fromContent = fromBlock.content;
      toContent = text.substring(toStart + 4);
      const lastValid = toContent.lastIndexOf('>');
      if (lastValid > toContent.length * 0.9) {
        toContent = toContent.substring(0, lastValid + 1);
      }
      cursor = text.length;
    }

    fromContent = stripPatchEdgeNewlines(fromContent);
    toContent = stripPatchEdgeNewlines(toContent);

    if (fromContent.length > 0 || toContent.length > 0) {
      blocks.push({ find: fromContent, replace: toContent, from: fromContent, to: toContent, description: `Change ${blocks.length + 1}` });
    }

    if (cursor <= cPos) {
      cursor = cPos + 2;
    }
  }

  return blocks.length > 0 ? blocks : null;
};

export const applyCrisprPatches = (sourceCode, blocks) => {
  if (!sourceCode || !blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return { html: sourceCode, code: sourceCode, applied: 0, failed: 0, errors: [], results: [] };
  }

  let modified = sourceCode;
  let applied = 0;
  let failed = 0;
  const errors = [];
  const results = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!block || typeof block !== 'object') {
      failed++;
      results.push({ ...block, success: false, error: 'Invalid structure' });
      continue;
    }

    const fromText = block.from || block.find || '';
    const toText = block.to || block.replace || '';

    if (!fromText || fromText.trim().length === 0) {
      failed++;
      results.push({ ...block, success: false, error: 'Empty from/find pattern' });
      continue;
    }

    let match = findBestMatch(modified, fromText);

    if (!match && fromText.includes('//')) {
      const stripped = fromText.split('\n').map(line => {
        const commentIdx = line.indexOf('//');
        return commentIdx >= 0 ? line.substring(0, commentIdx).trimEnd() : line;
      }).filter(line => line.trim().length > 0).join('\n');

      if (stripped.length > 10 && stripped !== fromText) {
        match = findBestMatch(modified, stripped);
        if (match) match.strategy = 'comment-stripped';
      }
    }

    if (!match && fromText.length > 40) {
      const lines = fromText.split('\n').filter(l => l.trim().length > 0);
      if (lines.length > 2) {
        const subsetEnd = Math.ceil(lines.length * 0.6);
        const subsetPattern = lines.slice(0, subsetEnd).join('\n');
        const subsetMatch = findBestMatch(modified, subsetPattern);

        if (subsetMatch) {
          const lastLines = lines.slice(-Math.min(3, Math.floor(lines.length * 0.3)));
          const searchStart = subsetMatch.index + subsetMatch.match.length;
          const searchWindow = Math.min(modified.length, searchStart + 500);
          const searchRegion = modified.substring(searchStart, searchWindow);

          let endOffset = subsetMatch.match.length;
          for (const lastLine of lastLines) {
            const trimmedLast = lastLine.trim();
            if (trimmedLast.length < 3) continue;
            const lastIdx = searchRegion.indexOf(trimmedLast);
            if (lastIdx !== -1) {
              endOffset = (searchStart - subsetMatch.index) + lastIdx + trimmedLast.length;
            }
          }

          match = {
            index: subsetMatch.index,
            match: modified.substring(subsetMatch.index, subsetMatch.index + endOffset),
            exact: false,
            strategy: 'subset-anchor'
          };
        }
      }
    }

    if (match) {
      const before = modified.substring(0, match.index);
      const after = modified.substring(match.index + match.match.length);
      modified = before + toText + after;
      applied++;
      results.push({
        ...block,
        success: true,
        matchType: match.strategy || (match.exact ? 'exact' : 'fuzzy'),
        description: block.description || `Change ${i + 1}`,
        matchedText: match.match.substring(0, 60) + (match.match.length > 60 ? '...' : '')
      });
    } else {
      failed++;
      const preview = fromText.substring(0, 60);
      errors.push(`Block ${i + 1}: Pattern not found — "${preview}..."`);
      results.push({
        ...block,
        success: false,
        error: 'Pattern not found in source',
        description: block.description || `Change ${i + 1}`,
        patternPreview: preview
      });
    }
  }

  return { html: modified, code: modified, applied, failed, errors, results };
};

export const cleanCodeBlock = (text) => {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:javascript|js|jsx|typescript|ts|tsx)?\s*\n?/gm, '');
  cleaned = cleaned.replace(/\n?```\s*$/gm, '');
  return cleaned.trim();
};

export const prettifyHtml = (html) => {
  if (!html || typeof html !== 'string') return html || '';

  // If already well-formatted (has indented lines), return as-is
  const existingLines = html.split('\n');
  if (existingLines.length > 30 && existingLines.filter(l => /^\s{2,}</.test(l)).length > 5) {
    return html;
  }

  const preserveBlockRegex = /<(script|style|pre|textarea)\b[^>]*>[\s\S]*?<\/\1>/gi;
  const tokens = [];
  let cursor = 0;
  let match;

  while ((match = preserveBlockRegex.exec(html)) !== null) {
    const before = html.slice(cursor, match.index);
    if (before) {
      before.replace(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g, token => {
        tokens.push(token);
        return token;
      });
    }
    tokens.push(match[0]);
    cursor = match.index + match[0].length;
  }

  const tail = html.slice(cursor);
  if (tail) {
    tail.replace(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g, token => {
      tokens.push(token);
      return token;
    });
  }

  let depth = 0;
  const result = [];
  const INDENT = '  ';
  const voidElements = new Set([
    'area','base','br','col','embed','hr','img','input','link','meta','source','track','wbr'
  ]);

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    const isPreserveBlock = /^<(script|style|pre|textarea)\b/i.test(trimmed) && /<\/(script|style|pre|textarea)>$/i.test(trimmed);
    if (isPreserveBlock) {
      const lines = trimmed.split('\n');
      const nonEmptyLines = lines.filter(line => line.trim().length > 0);
      const minIndent = nonEmptyLines.length > 1
        ? Math.min(...nonEmptyLines.slice(1).map(line => (line.match(/^\s*/) || [''])[0].length))
        : 0;
      result.push(lines.map(line => {
        if (!line.trim()) return '';
        const normalizedLine = minIndent > 0 ? line.replace(new RegExp(`^\\s{0,${minIndent}}`), '') : line;
        return INDENT.repeat(depth) + normalizedLine;
      }).join('\n'));
      continue;
    }

    if (/^<!--/.test(trimmed)) {
      result.push(INDENT.repeat(depth) + trimmed);
      continue;
    }

    if (!/^</.test(trimmed)) {
      result.push(INDENT.repeat(depth) + trimmed.replace(/\s+/g, ' '));
      continue;
    }

    const isClosingTag = /^<\/[a-zA-Z]/.test(trimmed);
    const isOpeningTag = /^<[a-zA-Z]/.test(trimmed) && !isClosingTag;
    const isSelfClosing = /\/>$/.test(trimmed);
    const tagMatch = trimmed.match(/^<\/?([a-zA-Z][a-zA-Z0-9]*)/);
    const tagName = tagMatch ? tagMatch[1].toLowerCase() : '';
    const isVoid = voidElements.has(tagName);
    // Check if the same tag opens and closes on one line: <div>...</div>
    const opensAndCloses = isOpeningTag && new RegExp(`</${tagName}\\s*>`, 'i').test(trimmed);

    // De-indent for closing tags
    if (isClosingTag) {
      depth = Math.max(0, depth - 1);
    }

    result.push(INDENT.repeat(depth) + trimmed);

    // Indent after opening tags (unless void, self-closing, or opens+closes on same line)
    if (isOpeningTag && !isSelfClosing && !isVoid && !opensAndCloses) {
      depth++;
    }
  }

  return result.join('\n');
};

export const cleanAndValidateHtml = (rawHtml) => {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return { success: false, html: null, error: 'Empty response' };
  }
  
  let cleanHtml = rawHtml.trim();
  
  // Pattern 1: Remove markdown code fences (most common)
  cleanHtml = cleanHtml.replace(/^```(?:html|HTML)?\s*\n?/gm, '');
  cleanHtml = cleanHtml.replace(/\n?```\s*$/gm, '');
  
  // Pattern 2: Find DOCTYPE or HTML tag start
  const doctypeIndex = cleanHtml.toLowerCase().indexOf('<!doctype');
  const htmlTagIndex = cleanHtml.toLowerCase().indexOf('<html');
  const startIndex = doctypeIndex >= 0 ? doctypeIndex : htmlTagIndex;
  
  if (startIndex > 0) {
    cleanHtml = cleanHtml.substring(startIndex);
  }
  
  // Pattern 3: Find closing HTML tag and trim anything after
  const closingHtmlMatch = cleanHtml.toLowerCase().lastIndexOf('</html>');
  if (closingHtmlMatch > 0) {
    cleanHtml = cleanHtml.substring(0, closingHtmlMatch + 7);
  }
  
  // Pattern 4: Remove any leading text before first tag
  const firstTagIndex = cleanHtml.indexOf('<');
  if (firstTagIndex > 0) {
    cleanHtml = cleanHtml.substring(firstTagIndex);
  }
  
  // Validate the cleaned HTML
  const validation = validateHtmlStructure(cleanHtml);
  
  if (!validation.valid) {
    // Last resort: Try to wrap partial HTML in basic structure
    if (cleanHtml.includes('<body') || cleanHtml.includes('<div')) {
      const wrapped = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Mockup</title></head>${cleanHtml.includes('<body') ? cleanHtml : '<body>' + cleanHtml + '</body>'}</html>`;
      const revalidation = validateHtmlStructure(wrapped);
      if (revalidation.valid) {
        return { success: true, html: wrapped, error: null };
      }
    }
    return { success: false, html: null, error: validation.error };
  }
  
  return { success: true, html: cleanHtml.trim(), error: null };
};

export const detectVideoBackgroundIntent = (text) => {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();

  const exactKeywords = [
    'video background', 'video backgrounds',
    'animated background', 'animated backgrounds',
    'video for every section', 'video for each section',
    'video for every tile', 'video for each tile',
    'video behind', 'moving background',
    'cinematic background', 'cinematic backgrounds',
    'video hero', 'video backdrop',
    'background video', 'background videos',
    'video wallpaper', 'video on every', 'video on each',
    'videos on every', 'videos on each',
    'video tiles', 'animated tiles',
    'video sections', 'video in every', 'video in each',
    'videos in every', 'videos in each',
    'video bg', 'animated bg',
    'video overlay', 'looping video', 'looping background',
    'motion background', 'motion backgrounds',
    'dynamic background', 'dynamic backgrounds',
    'video for all section', 'video for all tile',
    'video everywhere', 'videos everywhere',
    'video player', 'video players',
    'embed video', 'embed videos', 'embedded video',
    'inline video', 'inline videos',
    'video thumbnail', 'video thumbnails',
    'video card', 'video cards',
    'video gallery', 'video grid',
    'video showcase', 'video preview', 'video previews',
    'video foreground', 'foreground video',
    'video element', 'video elements',
    'video content', 'video clip', 'video clips',
    'play video', 'playing video',
    'autoplay video', 'video header',
    'hero video', 'video banner',
    'video reel', 'video carousel', 'video slider',
    'video loop', 'video loops',
    'video widget', 'video component',
    'video section', 'add video', 'add videos',
    'include video', 'include videos',
    'show video', 'show videos',
    'display video', 'display videos',
    'video portfolio', 'video testimonial', 'video testimonials',
    'product video', 'demo video', 'promo video',
    'video promo', 'video ad', 'video feature',
    'video decoration', 'decorative video',
    'ambient video', 'cinematic video',
    'video intro', 'video splash',
    'ai video', 'new video', 'update video',
    'change video', 'replace video', 'swap video',
    'regenerate video', 'refresh video', 'redo video',
    'generate video', 'create video', 'make video'
  ];

  if (exactKeywords.some(kw => lower.includes(kw))) return true;

  const hasVideoWord = /\bvideos?\b/.test(lower);
  if (hasVideoWord) {
    const contextWords = [
      'update', 'change', 'replace', 'add', 'create', 'generate',
      'new', 'refresh', 'redo', 'make', 'build', 'insert', 'inject',
      'put', 'set', 'hero', 'background', 'section', 'header',
      'banner', 'ai', 'animate', 'animated', 'motion', 'cinematic',
      'loop', 'autoplay', 'fullscreen', 'cover', 'overlay',
      'thumbnail', 'gallery', 'grid', 'player', 'embed',
      'foreground', 'decoration', 'ambient', 'immersive',
      'regenerate', 'swap', 'modify', 'upgrade', 'improve',
      'enhance', 'fix', 'render', 'produce', 'show', 'display',
      'include', 'want', 'need', 'get', 'use'
    ];
    if (contextWords.some(w => lower.includes(w))) return true;
  }

  return false;
};

export const PERPLEXITY_MODELS = {
  'sonar-deep-research': {
    name: 'Sonar Deep Research',
    speed: 'slow',
    depth: 5,
    description: 'Exhaustive multi-step research with iterative query refinement',
    maxContextTokens: 128000,
  },
  'sonar-reasoning-pro': {
    name: 'Sonar Reasoning Pro',
    speed: 'moderate',
    depth: 4,
    description: 'Advanced logic with real-time web grounding and chain-of-thought',
    maxContextTokens: 128000,
  },
  'sonar-pro': {
    name: 'Sonar Pro',
    speed: 'fast',
    depth: 3,
    description: 'High-performance general search with 200k context',
    maxContextTokens: 200000,
  },
  'sonar-reasoning': {
    name: 'Sonar Reasoning',
    speed: 'fast',
    depth: 2,
    description: 'Streamlined logical reasoning with search',
    maxContextTokens: 128000,
  },
  'sonar': {
    name: 'Sonar',
    speed: 'instant',
    depth: 1,
    description: 'Fast factual retrieval and simple summaries',
    maxContextTokens: 128000,
  }
};

export const FREE_API_REGISTRY = [
  { id: 'rest-countries', name: 'REST Countries', baseUrl: 'https://restcountries.com/v3.1', keywords: ['country', 'countries', 'population', 'capital', 'flag', 'currency', 'language', 'continent'], exampleEndpoints: ['/name/{name}', '/all', '/alpha/{code}'], description: 'Country data: population, flags, currencies, languages' },
  { id: 'open-meteo', name: 'Open-Meteo', baseUrl: 'https://api.open-meteo.com/v1/forecast', keywords: ['weather', 'temperature', 'forecast', 'rain', 'wind', 'humidity', 'climate'], exampleEndpoints: ['?latitude={lat}&longitude={lon}&current_weather=true'], description: 'Weather forecasts, historical weather, air quality' },
  { id: 'wikipedia', name: 'Wikipedia', baseUrl: 'https://en.wikipedia.org/w/api.php', keywords: ['wikipedia', 'wiki', 'encyclopedia', 'article', 'definition of', 'what is', 'who is', 'history of'], exampleEndpoints: ['?action=query&list=search&srsearch={query}&format=json&origin=*', '?action=query&prop=extracts&exintro&explaintext&titles={title}&format=json&origin=*'], description: 'Wikipedia article search and summaries' },
  { id: 'numbers-api', name: 'Numbers API', baseUrl: 'http://numbersapi.com', keywords: ['number fact', 'math fact', 'number trivia', 'fun fact about number'], exampleEndpoints: ['/{number}', '/{number}/math', '/random/trivia'], description: 'Fun facts about numbers, dates, math trivia' },
  { id: 'open-library', name: 'Open Library', baseUrl: 'https://openlibrary.org', keywords: ['book', 'books', 'author', 'novel', 'isbn', 'reading', 'library', 'literature'], exampleEndpoints: ['/search.json?q={query}&limit=5', '/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data'], description: 'Book search, covers, author info' },
  { id: 'datamuse', name: 'Datamuse', baseUrl: 'https://api.datamuse.com', keywords: ['rhyme', 'synonym', 'antonym', 'word that means', 'words like', 'sounds like'], exampleEndpoints: ['/words?rel_rhy={word}', '/words?ml={meaning}', '/words?rel_syn={word}'], description: 'Word finding, rhymes, synonyms' },
  { id: 'pokeapi', name: 'PokeAPI', baseUrl: 'https://pokeapi.co/api/v2', keywords: ['pokemon', 'pokémon', 'pikachu', 'charizard', 'pokedex', 'starter pokemon'], exampleEndpoints: ['/pokemon/{name}', '/pokemon/{id}', '/type/{type}'], description: 'Full Pokémon database with stats, sprites, abilities' },
  { id: 'dog-ceo', name: 'Dog CEO', baseUrl: 'https://dog.ceo/api', keywords: ['dog', 'dogs', 'puppy', 'breed', 'dog image', 'dog photo'], exampleEndpoints: ['/breeds/image/random', '/breed/{breed}/images/random'], description: 'Random dog images by breed' },
  { id: 'cat-api', name: 'The Cat API', baseUrl: 'https://api.thecatapi.com/v1', keywords: ['cat', 'cats', 'kitten', 'cat image', 'cat photo'], exampleEndpoints: ['/images/search'], description: 'Random cat images' },
  { id: 'chuck-norris', name: 'Chuck Norris Jokes', baseUrl: 'https://api.chucknorris.io', keywords: ['chuck norris', 'joke', 'chuck norris joke'], exampleEndpoints: ['/jokes/random', '/jokes/random?category={category}'], description: 'Random Chuck Norris jokes' },
  { id: 'advice-slip', name: 'Advice Slip', baseUrl: 'https://api.adviceslip.com', keywords: ['advice', 'life advice', 'random advice', 'wisdom'], exampleEndpoints: ['/advice', '/advice/search/{query}'], description: 'Random life advice' },
  { id: 'bored-api', name: 'Bored API', baseUrl: 'https://bored-api.appbrewery.com/api', keywords: ['bored', 'activity', 'something to do', 'what should i do', 'fun activity'], exampleEndpoints: ['/activity'], description: 'Random activity suggestions' },
  { id: 'useless-facts', name: 'Useless Facts', baseUrl: 'https://uselessfacts.jsph.pl/api/v2/facts', keywords: ['random fact', 'fun fact', 'did you know', 'useless fact', 'trivia'], exampleEndpoints: ['/random?language=en'], description: 'Random useless facts' },
  { id: 'nasa-apod', name: 'NASA APOD', baseUrl: 'https://api.nasa.gov/planetary/apod', keywords: ['nasa', 'astronomy', 'space photo', 'picture of the day', 'apod', 'cosmos'], exampleEndpoints: ['?api_key=DEMO_KEY'], description: 'Astronomy Picture of the Day' },
  { id: 'sunrise-sunset', name: 'Sunrise-Sunset', baseUrl: 'https://api.sunrise-sunset.org/json', keywords: ['sunrise', 'sunset', 'daylight', 'golden hour'], exampleEndpoints: ['?lat={lat}&lng={lng}&formatted=0'], description: 'Sunrise/sunset times for any coordinates' },
  { id: 'iss-location', name: 'ISS Location', baseUrl: 'http://api.open-notify.org/iss-now.json', keywords: ['iss', 'international space station', 'space station location', 'where is the iss'], exampleEndpoints: [''], description: 'Real-time ISS position' },
  { id: 'usgs-earthquake', name: 'USGS Earthquake', baseUrl: 'https://earthquake.usgs.gov/fdsnws/event/1', keywords: ['earthquake', 'seismic', 'quake', 'tremor', 'earthquakes today'], exampleEndpoints: ['/query?format=geojson&limit=5&orderby=time'], description: 'Real-time earthquake data worldwide' },
  { id: 'coingecko', name: 'CoinGecko', baseUrl: 'https://api.coingecko.com/api/v3', keywords: ['bitcoin', 'ethereum', 'crypto', 'cryptocurrency', 'btc', 'eth', 'coin price', 'token price', 'market cap'], exampleEndpoints: ['/simple/price?ids={coin}&vs_currencies=usd', '/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10'], description: 'Crypto prices, market data' },
  { id: 'exchange-rate', name: 'ExchangeRate API', baseUrl: 'https://open.er-api.com/v6/latest', keywords: ['exchange rate', 'currency conversion', 'usd to eur', 'forex', 'currency rate'], exampleEndpoints: ['/USD'], description: 'Currency exchange rates' },
  { id: 'ip-api', name: 'IP API', baseUrl: 'http://ip-api.com/json', keywords: ['my ip', 'ip address', 'geolocation', 'where am i', 'my location'], exampleEndpoints: ['', '/{ip}'], description: 'Geolocation from IP address' },
  { id: 'agify', name: 'Agify', baseUrl: 'https://api.agify.io', keywords: ['age from name', 'how old is', 'predict age', 'name age'], exampleEndpoints: ['?name={name}'], description: 'Predicts age from a name' },
  { id: 'nationalize', name: 'Nationalize', baseUrl: 'https://api.nationalize.io', keywords: ['nationality from name', 'where is name from', 'name origin', 'name nationality'], exampleEndpoints: ['?name={name}'], description: 'Predicts nationality from a name' },
  { id: 'genderize', name: 'Genderize', baseUrl: 'https://api.genderize.io', keywords: ['gender from name', 'is name male or female', 'name gender'], exampleEndpoints: ['?name={name}'], description: 'Predicts gender from a name' },
  { id: 'themealdb', name: 'TheMealDB', baseUrl: 'https://www.themealdb.com/api/json/v1/1', keywords: ['recipe', 'meal', 'cooking', 'food', 'dinner', 'lunch', 'how to cook', 'ingredients for'], exampleEndpoints: ['/search.php?s={meal}', '/random.php', '/filter.php?c={category}'], description: 'Recipe search, random meals, categories' },
  { id: 'thecocktaildb', name: 'TheCocktailDB', baseUrl: 'https://www.thecocktaildb.com/api/json/v1/1', keywords: ['cocktail', 'drink', 'bartender', 'mixed drink', 'how to make a', 'margarita', 'mojito'], exampleEndpoints: ['/search.php?s={cocktail}', '/random.php', '/filter.php?i={ingredient}'], description: 'Cocktail recipes, ingredients, images' },
  { id: 'deck-of-cards', name: 'Deck of Cards', baseUrl: 'https://deckofcardsapi.com/api', keywords: ['card game', 'deck of cards', 'draw a card', 'shuffle cards', 'playing cards'], exampleEndpoints: ['/deck/new/shuffle/', '/deck/{deck_id}/draw/?count=5'], description: 'Simulate a full card deck, draw, shuffle' },
];

export const selectSearchModel = (context = {}, defaultModel = 'sonar') => {
  const {
    purpose = 'general',
    query = '',
    phase = 'unknown',
    fastMode = false,
    queryIndex = 0,
    totalQueries = 1,
    urgency = 'medium'
  } = context;

  if (fastMode) return 'sonar';
  if (urgency === 'critical') return 'sonar';

  const purposeMap = {
    'deep-research': 'sonar-deep-research',
    'white-paper': 'sonar-deep-research',
    'comprehensive-report': 'sonar-deep-research',
    'market-analysis': 'sonar-deep-research',
    'competitive-analysis': 'sonar-reasoning-pro',
    'technical-comparison': 'sonar-reasoning-pro',
    'architecture-decision': 'sonar-reasoning-pro',
    'legal-compliance': 'sonar-reasoning-pro',
    'troubleshooting': 'sonar-reasoning-pro',
    'trend-analysis': defaultModel,
    'feature-research': defaultModel,
    'ux-patterns': defaultModel,
    'documentation-lookup': defaultModel,
    'api-research': defaultModel,
    'quick-fact': 'sonar',
    'price-check': 'sonar',
    'current-date': 'sonar',
    'simple-lookup': 'sonar',
  };

  if (purposeMap[purpose]) return purposeMap[purpose];

  const phaseMap = {
    'intel': defaultModel,
    'gap-research': 'sonar-reasoning-pro',
    'scout': defaultModel,
    'synthesis': 'sonar-reasoning',
    'agent-iteration': 'sonar',
    'crispr': 'sonar',
    'red-team': 'sonar-reasoning',
    'cross-validation': 'sonar-reasoning-pro',
  };

  if (phaseMap[phase]) return phaseMap[phase];

  const queryLower = query.toLowerCase();
  const complexitySignals = [
    'compare', 'versus', 'vs', 'difference between', 'pros and cons',
    'why does', 'how does', 'explain', 'analyze', 'evaluate',
    'best practices', 'architecture', 'trade-offs', 'implications'
  ];
  const isComplexQuery = complexitySignals.some(s => queryLower.includes(s));

  const depthSignals = [
    'comprehensive', 'detailed', 'in-depth', 'thorough', 'exhaustive',
    'research', 'investigation', 'study', 'report', 'analysis'
  ];
  const needsDepth = depthSignals.some(s => queryLower.includes(s));

  if (needsDepth) return defaultModel;
  if (isComplexQuery) return 'sonar-reasoning';

  if (totalQueries > 3 && queryIndex > 2) return 'sonar';

  return defaultModel;
};

// ─── Physics Connector Overlay (SVG lines between connected artifacts) ──────
