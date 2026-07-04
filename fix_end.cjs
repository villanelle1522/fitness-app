const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const endTarget = `                          );
                        })
                    )}
                  </div>
                </div>
              )}
              {/* TAB 2: MANUAL DATA FILL FORM */}`;

const endReplace = `                          );
                        });
                      })()
                    }
                  </div>
                </div>
              )}
              {/* TAB 2: MANUAL DATA FILL FORM */}`;

content = content.replace(endTarget, endReplace);
fs.writeFileSync('src/App.tsx', content);
