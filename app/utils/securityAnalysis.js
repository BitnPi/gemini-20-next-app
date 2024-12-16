export const suspiciousKeywords = [
    'intruder',
    'break-in',
    'suspicious',
    'unknown person',
    'stranger',
    'trespassing',
    'trespasser',
    'break in',
    'breaking in',
    'forced entry',
    'unauthorized',
    'burglar',
    'theft',
    'stealing',
    'night',
    'masked'
  ];
  
  export const analyzeForSecurity = (analysis) => {
    try {
      // If the analysis is a string (from Gemini), try to parse it as JSON
      const data = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
      
      const flags = [];
      const timestamps = [];
  
      // Check main subject/topic
      if (data.main_subject) {
        const mainSubjectLower = data.main_subject.toLowerCase();
        suspiciousKeywords.forEach(keyword => {
          if (mainSubjectLower.includes(keyword.toLowerCase())) {
            flags.push(`Suspicious activity detected in main subject: ${keyword}`);
          }
        });
      }
  
      // Check key events
      if (Array.isArray(data.key_events)) {
        data.key_events.forEach(event => {
          if (event.event) {
            const eventLower = event.event.toLowerCase();
            suspiciousKeywords.forEach(keyword => {
              if (eventLower.includes(keyword.toLowerCase())) {
                flags.push(`Suspicious activity detected at ${event.timestamp}: ${keyword}`);
                timestamps.push(event.timestamp);
              }
            });
          }
        });
      }
  
      // Check overall summary
      if (data.overall_summary) {
        const summaryLower = data.overall_summary.toLowerCase();
        suspiciousKeywords.forEach(keyword => {
          if (summaryLower.includes(keyword.toLowerCase())) {
            flags.push(`Suspicious activity detected in summary: ${keyword}`);
          }
        });
      }
  
      return {
        hasSuspiciousActivity: flags.length > 0,
        flags,
        timestamps,
        severity: flags.length > 2 ? 'high' : flags.length > 0 ? 'medium' : 'low'
      };
    } catch (error) {
      console.error('Error analyzing security:', error);
      return {
        hasSuspiciousActivity: false,
        flags: [],
        timestamps: [],
        severity: 'low'
      };
    }
  };
  