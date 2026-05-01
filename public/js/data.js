// ── COUNTRY RISK DATA ─────────────────────────────────────────
// Key: ISO 3166-1 numeric (matches world-atlas TopoJSON IDs)
// risk: 1 (very safe) → 10 (active war zone)
// Based on Global Peace Index 2024 + current conflict analysis
// Last updated: 2026-05-01

const COUNTRY_DATA = {
  "4":   { name:"Afghanistan",         alpha2:"AF", risk:10, region:"South Asia",        tags:["war","terrorism","instability"],           info:"Taliban-controlled state. Active insurgency, extreme poverty, humanitarian crisis, women's rights abolished." },
  "8":   { name:"Albania",             alpha2:"AL", risk:3,  region:"Europe",            tags:["political"],                               info:"EU candidate state, improving democracy, some organised crime." },
  "12":  { name:"Algeria",             alpha2:"DZ", risk:6,  region:"North Africa",      tags:["authoritarian","terrorism"],                info:"Military-backed government, protests suppressed, Saharan border threats from Sahel jihadists." },
  "20":  { name:"Andorra",             alpha2:"AD", risk:1,  region:"Europe",            tags:[],                                          info:"Tiny, very peaceful microstate between France and Spain." },
  "24":  { name:"Angola",              alpha2:"AO", risk:6,  region:"Sub-Saharan Africa",tags:["crime","poverty"],                         info:"Post-war recovery, significant crime, political repression, oil-dependent economy." },
  "32":  { name:"Argentina",           alpha2:"AR", risk:4,  region:"South America",     tags:["economic","political"],                    info:"Economic crisis, political polarisation, but generally safe for travel." },
  "36":  { name:"Australia",           alpha2:"AU", risk:1,  region:"Oceania",           tags:[],                                          info:"Very safe, stable democracy with strong institutions." },
  "40":  { name:"Austria",             alpha2:"AT", risk:1,  region:"Europe",            tags:[],                                          info:"Among the world's most peaceful countries. EU/NATO." },
  "50":  { name:"Bangladesh",          alpha2:"BD", risk:6,  region:"South Asia",        tags:["political","extremism"],                   info:"Political instability post-Hasina, extremist activity, labour rights concerns." },
  "56":  { name:"Belgium",             alpha2:"BE", risk:2,  region:"Europe",            tags:["terrorism"],                               info:"Generally safe. Some terrorism vigilance; political complexity." },
  "64":  { name:"Bhutan",              alpha2:"BT", risk:1,  region:"South Asia",        tags:[],                                          info:"Very peaceful Buddhist kingdom with strong environmental focus." },
  "68":  { name:"Bolivia",             alpha2:"BO", risk:5,  region:"South America",     tags:["political","crime"],                       info:"Political polarisation, protests, drug-related crime in border areas." },
  "70":  { name:"Bosnia",              alpha2:"BA", risk:4,  region:"Europe",            tags:["ethnic","political"],                      info:"Post-war ethnic tensions, political deadlock; EU aspirant with fragile peace." },
  "72":  { name:"Botswana",            alpha2:"BW", risk:3,  region:"Sub-Saharan Africa",tags:[],                                          info:"One of Africa's most stable democracies, good governance record." },
  "76":  { name:"Brazil",              alpha2:"BR", risk:5,  region:"South America",     tags:["crime","political"],                       info:"High urban crime and homicide rate, political polarisation, Amazon pressures." },
  "100": { name:"Bulgaria",            alpha2:"BG", risk:3,  region:"Europe",            tags:[],                                          info:"EU member, generally stable despite corruption concerns." },
  "104": { name:"Myanmar",             alpha2:"MM", risk:10, region:"Southeast Asia",    tags:["war","coup","ethnic"],                     info:"Military coup 2021 triggered civil war. PDFs and ethnic armed groups control large areas. Massive displacement." },
  "108": { name:"Burundi",             alpha2:"BI", risk:8,  region:"Sub-Saharan Africa",tags:["political","violence"],                    info:"Authoritarian rule, political violence, food insecurity, regional instability." },
  "116": { name:"Cambodia",            alpha2:"KH", risk:4,  region:"Southeast Asia",    tags:["authoritarian"],                           info:"Single-party authoritarian state under Hun Manet; improving economy, political repression." },
  "120": { name:"Cameroon",            alpha2:"CM", risk:7,  region:"Sub-Saharan Africa",tags:["armed conflict","separatism"],             info:"Anglophone separatist conflict ongoing; Boko Haram activity in the north." },
  "124": { name:"Canada",              alpha2:"CA", risk:1,  region:"North America",     tags:[],                                          info:"Very safe, stable G7 democracy with strong rule of law." },
  "140": { name:"Cent. African Rep.",  alpha2:"CF", risk:9,  region:"Sub-Saharan Africa",tags:["war","armed groups"],                      info:"Armed groups control most territory. Russian forces backing junta. UN peacekeeping mission ongoing." },
  "144": { name:"Sri Lanka",           alpha2:"LK", risk:4,  region:"South Asia",        tags:["economic","political"],                    info:"Recovering from 2022 economic collapse. Political uncertainty but improving stability." },
  "152": { name:"Chile",               alpha2:"CL", risk:3,  region:"South America",     tags:["political"],                               info:"Generally stable with strong institutions; social unrest since 2019." },
  "156": { name:"China",               alpha2:"CN", risk:5,  region:"East Asia",         tags:["authoritarian","territorial"],             info:"Authoritarian single-party state. Taiwan tensions, South China Sea disputes, Xinjiang/Tibet repression." },
  "170": { name:"Colombia",            alpha2:"CO", risk:6,  region:"South America",     tags:["armed groups","narco"],                    info:"FARC dissidents, ELN activity, drug-related violence. Peace process ongoing." },
  "174": { name:"Comoros",             alpha2:"KM", risk:5,  region:"Sub-Saharan Africa",tags:["political"],                               info:"History of coups, political instability, but recent relative calm." },
  "178": { name:"Congo (Rep.)",        alpha2:"CG", risk:7,  region:"Sub-Saharan Africa",tags:["crime","instability"],                     info:"Political tensions, armed groups active in Pool region, oil dependency." },
  "180": { name:"DR Congo",            alpha2:"CD", risk:9,  region:"Sub-Saharan Africa",tags:["war","armed groups","humanitarian"],       info:"Decades of conflict. M23 rebellion controls North Kivu. 100+ armed groups, world's worst humanitarian crisis." },
  "188": { name:"Costa Rica",          alpha2:"CR", risk:2,  region:"Central America",   tags:[],                                          info:"Most peaceful country in Central America, stable democracy." },
  "191": { name:"Croatia",             alpha2:"HR", risk:2,  region:"Europe",            tags:[],                                          info:"EU/NATO member, stable, popular tourist destination." },
  "192": { name:"Cuba",                alpha2:"CU", risk:6,  region:"Caribbean",         tags:["authoritarian","economic"],                info:"Authoritarian state, severe economic crisis, mass emigration, protests suppressed brutally." },
  "196": { name:"Cyprus",              alpha2:"CY", risk:3,  region:"Europe",            tags:["territorial"],                             info:"Divided island, northern zone under Turkish control. EU member, generally safe." },
  "203": { name:"Czech Republic",      alpha2:"CZ", risk:1,  region:"Europe",            tags:[],                                          info:"Stable EU/NATO member, very safe." },
  "208": { name:"Denmark",             alpha2:"DK", risk:1,  region:"Europe",            tags:[],                                          info:"One of the world's most peaceful and stable nations." },
  "214": { name:"Dominican Republic",  alpha2:"DO", risk:5,  region:"Caribbean",         tags:["crime"],                                   info:"Drug trafficking, kidnappings in some areas, tourist zones generally safe." },
  "218": { name:"Ecuador",             alpha2:"EC", risk:7,  region:"South America",     tags:["crime","narco"],                           info:"Dramatic surge in cartel violence since 2022. State of emergency declared multiple times. Prison massacres." },
  "818": { name:"Egypt",               alpha2:"EG", risk:6,  region:"North Africa",      tags:["authoritarian","terrorism"],               info:"Military-backed government since 2013 coup. Sinai insurgency, mass political imprisonment." },
  "222": { name:"El Salvador",         alpha2:"SV", risk:5,  region:"Central America",   tags:["authoritarian","crime"],                   info:"Bukele's mass incarceration slashed gang violence but at democratic cost." },
  "231": { name:"Ethiopia",            alpha2:"ET", risk:8,  region:"Sub-Saharan Africa",tags:["war","ethnic","famine"],                   info:"Post-Tigray instability. Amhara conflict ongoing, Oromia insurgency, aid access denied." },
  "246": { name:"Finland",             alpha2:"FI", risk:1,  region:"Europe",            tags:[],                                          info:"Joined NATO 2023. World's happiest country; very safe." },
  "250": { name:"France",              alpha2:"FR", risk:3,  region:"Europe",            tags:["terrorism"],                               info:"Terrorism vigilance, urban social unrest, but overall stable Western democracy." },
  "266": { name:"Gabon",               alpha2:"GA", risk:6,  region:"Sub-Saharan Africa",tags:["coup"],                                    info:"Military coup August 2023 ended Bongo dynasty. Transition government." },
  "276": { name:"Germany",             alpha2:"DE", risk:2,  region:"Europe",            tags:["political"],                               info:"Stable democracy, NATO/EU anchor. Some far-right extremism concerns." },
  "288": { name:"Ghana",               alpha2:"GH", risk:3,  region:"Sub-Saharan Africa",tags:[],                                          info:"One of West Africa's most stable democracies. Recent economic strains." },
  "300": { name:"Greece",              alpha2:"GR", risk:3,  region:"Europe",            tags:[],                                          info:"EU/NATO member, recovering from debt crisis. Generally safe." },
  "320": { name:"Guatemala",           alpha2:"GT", risk:7,  region:"Central America",   tags:["crime","narco","corruption"],              info:"High gang violence, narco-trafficking, impunity, entrenched corruption." },
  "324": { name:"Guinea",              alpha2:"GN", risk:7,  region:"Sub-Saharan Africa",tags:["coup","political"],                        info:"Military coup 2021, political violence, crackdown on opposition." },
  "328": { name:"Guyana",              alpha2:"GY", risk:5,  region:"South America",     tags:["territorial"],                             info:"Oil boom transforming economy; Venezuela territorial dispute threatening." },
  "332": { name:"Haiti",               alpha2:"HT", risk:9,  region:"Caribbean",         tags:["gangs","instability","humanitarian"],      info:"Gangs control 80%+ of Port-au-Prince. Political vacuum. Kenyan-led multinational security mission deployed." },
  "340": { name:"Honduras",            alpha2:"HN", risk:7,  region:"Central America",   tags:["crime","narco"],                           info:"High murder rate, narco-trafficking, corruption, MS-13 and Barrio 18 activity." },
  "348": { name:"Hungary",             alpha2:"HU", risk:3,  region:"Europe",            tags:["political"],                               info:"EU member, democratic backsliding under Orbán, but generally safe." },
  "356": { name:"India",               alpha2:"IN", risk:5,  region:"South Asia",        tags:["ethnic","terrorism","political"],          info:"Kashmir tensions, northeast insurgencies, communal violence, Maoist activity in some regions." },
  "360": { name:"Indonesia",           alpha2:"ID", risk:4,  region:"Southeast Asia",    tags:["terrorism","separatism"],                  info:"Papua separatist conflict, terrorism threat generally contained. Improving stability." },
  "364": { name:"Iran",                alpha2:"IR", risk:7,  region:"Middle East",       tags:["authoritarian","sanctions","nuclear"],     info:"Authoritarian regime, women's rights protests suppressed, nuclear standoff, proxy wars throughout region." },
  "368": { name:"Iraq",                alpha2:"IQ", risk:7,  region:"Middle East",       tags:["terrorism","instability"],                 info:"ISIS remnants active, Iran-backed militias dominant, political dysfunction, water scarcity crisis." },
  "372": { name:"Ireland",             alpha2:"IE", risk:1,  region:"Europe",            tags:[],                                          info:"Very peaceful EU member, consistently in top 10 GPI." },
  "376": { name:"Israel",              alpha2:"IL", risk:8,  region:"Middle East",       tags:["war","terrorism"],                         info:"Active military operations in Gaza and Lebanon. Regional threat from Iran and proxies. Internal political crisis." },
  "380": { name:"Italy",               alpha2:"IT", risk:2,  region:"Europe",            tags:[],                                          info:"Generally safe, organised crime limited to specific regions." },
  "388": { name:"Jamaica",             alpha2:"JM", risk:6,  region:"Caribbean",         tags:["crime","gangs"],                           info:"High violent crime rate, gang activity, frequent states of emergency in Kingston parishes." },
  "392": { name:"Japan",               alpha2:"JP", risk:1,  region:"East Asia",         tags:[],                                          info:"One of the world's safest countries. Exceptional public safety. North Korea missile overflights a concern." },
  "400": { name:"Jordan",              alpha2:"JO", risk:4,  region:"Middle East",       tags:["regional"],                               info:"Stable monarchy surrounded by conflict zones. Large refugee population. Generally safe for visitors." },
  "398": { name:"Kazakhstan",          alpha2:"KZ", risk:5,  region:"Central Asia",      tags:["authoritarian","political"],               info:"Post-protest crackdown 2022, Russian influence, authoritarian but stable." },
  "404": { name:"Kenya",               alpha2:"KE", risk:6,  region:"Sub-Saharan Africa",tags:["terrorism","political","crime"],           info:"Al-Shabaab terrorism from Somalia border, political instability, urban crime in Nairobi." },
  "408": { name:"North Korea",         alpha2:"KP", risk:9,  region:"East Asia",         tags:["authoritarian","nuclear","military"],      info:"World's most repressive state. Nuclear weapons program, ballistic missile tests, gulags, zero freedoms." },
  "410": { name:"South Korea",         alpha2:"KR", risk:2,  region:"East Asia",         tags:["regional"],                               info:"Stable democracy, strong economy. North Korea threat ever-present. Recent political crisis resolved." },
  "414": { name:"Kuwait",              alpha2:"KW", risk:3,  region:"Middle East",       tags:[],                                          info:"Stable Gulf state, parliamentary monarchy, generally safe." },
  "417": { name:"Kyrgyzstan",          alpha2:"KG", risk:5,  region:"Central Asia",      tags:["political","territorial"],                 info:"Political instability, border conflicts with Tajikistan, improving security." },
  "418": { name:"Laos",                alpha2:"LA", risk:4,  region:"Southeast Asia",    tags:["authoritarian"],                           info:"Authoritarian communist state but generally safe. Chinese debt dependency." },
  "422": { name:"Lebanon",             alpha2:"LB", risk:8,  region:"Middle East",       tags:["instability","economic","war"],            info:"State collapse, catastrophic economic crisis, Israeli strikes on Hezbollah, political vacuum." },
  "430": { name:"Liberia",             alpha2:"LR", risk:5,  region:"Sub-Saharan Africa",tags:["post-war"],                               info:"Post-civil war recovery, improving stability under new government." },
  "434": { name:"Libya",               alpha2:"LY", risk:8,  region:"North Africa",      tags:["war","instability","armed groups"],        info:"Divided between rival governments east/west. Armed factions, smuggling, migration crisis." },
  "440": { name:"Lithuania",           alpha2:"LT", risk:2,  region:"Europe",            tags:[],                                          info:"NATO/EU member on Russia's doorstep. Kaliningrad tensions, strong defence posture." },
  "442": { name:"Luxembourg",          alpha2:"LU", risk:1,  region:"Europe",            tags:[],                                          info:"Very safe EU/NATO member, world's highest per capita income." },
  "450": { name:"Madagascar",          alpha2:"MG", risk:5,  region:"Sub-Saharan Africa",tags:["poverty","political"],                    info:"Extreme poverty, political instability, climate vulnerability." },
  "454": { name:"Malawi",              alpha2:"MW", risk:4,  region:"Sub-Saharan Africa",tags:["poverty"],                                info:"Very poor but relatively peaceful, improving governance." },
  "458": { name:"Malaysia",            alpha2:"MY", risk:3,  region:"Southeast Asia",    tags:[],                                          info:"Generally safe, stable multi-ethnic democracy with some political tensions." },
  "466": { name:"Mali",                alpha2:"ML", risk:9,  region:"West Africa",       tags:["war","terrorism","coup"],                  info:"Military junta, jihadist insurgency covers 40%+ of territory. Russian forces, UN mission expelled." },
  "484": { name:"Mexico",              alpha2:"MX", risk:7,  region:"North America",     tags:["crime","narco","violence"],               info:"Cartel wars across multiple states. World's highest journalist killing rate. Impunity endemic." },
  "496": { name:"Mongolia",            alpha2:"MN", risk:3,  region:"East Asia",         tags:[],                                          info:"Stable democracy between China and Russia. Generally safe, economic challenges." },
  "504": { name:"Morocco",             alpha2:"MA", risk:4,  region:"North Africa",      tags:["terrorism","political"],                   info:"Terrorism vigilance, Western Sahara conflict frozen, authoritarian tendencies." },
  "508": { name:"Mozambique",          alpha2:"MZ", risk:7,  region:"Sub-Saharan Africa",tags:["terrorism","insurgency"],                  info:"Islamist insurgency in Cabo Delgado province. SADC/Rwandan forces deployed. Post-election violence 2024." },
  "516": { name:"Namibia",             alpha2:"NA", risk:3,  region:"Sub-Saharan Africa",tags:[],                                          info:"One of Africa's most stable democracies, good governance." },
  "524": { name:"Nepal",               alpha2:"NP", risk:4,  region:"South Asia",        tags:["political"],                               info:"Political instability, frequent government changes, but improving security." },
  "528": { name:"Netherlands",         alpha2:"NL", risk:2,  region:"Europe",            tags:[],                                          info:"Very safe EU/NATO member. Some organised crime concerns." },
  "554": { name:"New Zealand",         alpha2:"NZ", risk:1,  region:"Oceania",           tags:[],                                          info:"Consistently top 5 world's most peaceful countries." },
  "558": { name:"Nicaragua",           alpha2:"NI", risk:7,  region:"Central America",   tags:["authoritarian","political"],               info:"Ortega dictatorship. Opposition imprisoned, Church targeted, mass emigration." },
  "562": { name:"Niger",               alpha2:"NE", risk:9,  region:"West Africa",       tags:["coup","terrorism","instability"],          info:"Military coup July 2023. Jihadist insurgency. US/French forces expelled. Humanitarian crisis." },
  "566": { name:"Nigeria",             alpha2:"NG", risk:8,  region:"Sub-Saharan Africa",tags:["terrorism","armed groups","crime"],        info:"Boko Haram/ISWAP northeast, banditry northwest, separatism southeast. Africa's most populous nation in crisis." },
  "578": { name:"Norway",              alpha2:"NO", risk:1,  region:"Europe",            tags:[],                                          info:"Very peaceful NATO member with high human development." },
  "586": { name:"Pakistan",            alpha2:"PK", risk:8,  region:"South Asia",        tags:["terrorism","political","military"],        info:"TTP insurgency resurgent, political crisis, military dominance, nuclear state with India tensions." },
  "275": { name:"Palestine",           alpha2:"PS", risk:10, region:"Middle East",       tags:["war","occupation","humanitarian"],         info:"Gaza: active war with catastrophic civilian casualties and humanitarian blockade. West Bank: settler violence surging." },
  "591": { name:"Panama",              alpha2:"PA", risk:4,  region:"Central America",   tags:["crime"],                                   info:"Drug transit route, urban crime, but generally stable economy and governance." },
  "598": { name:"Papua New Guinea",    alpha2:"PG", risk:6,  region:"Oceania",           tags:["crime","tribal","instability"],            info:"High crime, tribal warfare, political instability, sexual violence epidemic." },
  "604": { name:"Peru",                alpha2:"PE", risk:5,  region:"South America",     tags:["political","crime"],                       info:"Political crisis, Sendero Luminoso remnants in VRAEM, mining protests, corruption." },
  "608": { name:"Philippines",         alpha2:"PH", risk:5,  region:"Southeast Asia",    tags:["terrorism","crime","political"],           info:"Abu Sayyaf activity in Mindanao, communist insurgency, political killings." },
  "616": { name:"Poland",              alpha2:"PL", risk:2,  region:"Europe",            tags:[],                                          info:"NATO/EU frontline state. Significantly boosting defence spending. Russia threat elevated." },
  "620": { name:"Portugal",            alpha2:"PT", risk:1,  region:"Europe",            tags:[],                                          info:"One of Europe's safest countries, stable EU member." },
  "634": { name:"Qatar",               alpha2:"QA", risk:3,  region:"Middle East",       tags:[],                                          info:"Stable Gulf state, diplomatic mediator. Labour rights concerns." },
  "642": { name:"Romania",             alpha2:"RO", risk:3,  region:"Europe",            tags:[],                                          info:"EU/NATO member, stable though corruption remains an issue." },
  "643": { name:"Russia",              alpha2:"RU", risk:8,  region:"Europe/Asia",       tags:["war","authoritarian","nuclear"],           info:"Waging full-scale invasion of Ukraine. Nuclear threats. Authoritarian regime. International isolation." },
  "646": { name:"Rwanda",              alpha2:"RW", risk:5,  region:"Sub-Saharan Africa",tags:["authoritarian","regional"],               info:"Authoritarian stability under Kagame. Accused of backing M23 in DRC." },
  "682": { name:"Saudi Arabia",        alpha2:"SA", risk:5,  region:"Middle East",       tags:["authoritarian","regional"],               info:"Authoritarian monarchy. Yemen war involvement. MBS reforms mixed. Regional rivalry with Iran." },
  "686": { name:"Senegal",             alpha2:"SN", risk:4,  region:"West Africa",       tags:["political"],                               info:"Democratic transition 2024, historically stable. Casamance conflict largely frozen." },
  "694": { name:"Sierra Leone",        alpha2:"SL", risk:5,  region:"Sub-Saharan Africa",tags:["post-war","political"],                   info:"Post-civil war recovery, political tensions, but improving stability." },
  "703": { name:"Slovakia",            alpha2:"SK", risk:2,  region:"Europe",            tags:["political"],                               info:"EU/NATO member. PM Fico shot 2024, recovered. Pro-Russia drift concerning allies." },
  "705": { name:"Slovenia",            alpha2:"SI", risk:1,  region:"Europe",            tags:[],                                          info:"Very safe EU/NATO member, high quality of life." },
  "706": { name:"Somalia",             alpha2:"SO", risk:10, region:"Sub-Saharan Africa",tags:["war","terrorism","failed state"],          info:"Al-Shabaab controls large territory. Clan violence. Famine risk. Droughts compound instability." },
  "710": { name:"South Africa",        alpha2:"ZA", risk:6,  region:"Sub-Saharan Africa",tags:["crime","political","economic"],           info:"Extremely high violent crime rate. Political instability, load-shedding. Improving with GNU." },
  "724": { name:"Spain",               alpha2:"ES", risk:2,  region:"Europe",            tags:["terrorism","political"],                   info:"Generally safe. Catalan independence tensions. ETA dormant. Terrorism vigilance." },
  "729": { name:"Sudan",               alpha2:"SD", risk:10, region:"North Africa",      tags:["war","genocide","humanitarian"],           info:"Civil war between SAF and RSF since April 2023. Mass atrocities in Darfur. World's largest displacement crisis." },
  "728": { name:"South Sudan",         alpha2:"SS", risk:9,  region:"Sub-Saharan Africa",tags:["war","humanitarian","instability"],       info:"Chronic armed conflict, renewed fighting, humanitarian catastrophe, famine conditions." },
  "752": { name:"Sweden",              alpha2:"SE", risk:2,  region:"Europe",            tags:["crime"],                                   info:"Gang violence and shootings a national issue but overall very safe. New NATO member." },
  "756": { name:"Switzerland",         alpha2:"CH", risk:1,  region:"Europe",            tags:[],                                          info:"Among the world's safest countries. Permanent neutrality, high institutions." },
  "760": { name:"Syria",               alpha2:"SY", risk:9,  region:"Middle East",       tags:["war","instability","terrorism"],           info:"Post-Assad era. HTS controls Damascus. Turkish, Kurdish, ISIS pockets remain. Reconstruction daunting." },
  "762": { name:"Tajikistan",          alpha2:"TJ", risk:6,  region:"Central Asia",      tags:["authoritarian","border"],                  info:"Authoritarian, poor, border conflicts with Kyrgyzstan, Afghan spillover risk." },
  "764": { name:"Thailand",            alpha2:"TH", risk:4,  region:"Southeast Asia",    tags:["political","coup"],                        info:"Military influence in politics, southern insurgency, political instability cycle." },
  "788": { name:"Tunisia",             alpha2:"TN", risk:5,  region:"North Africa",      tags:["authoritarian","political"],               info:"Presidential power grab 2021 reversed democratic gains. Economic crisis, migration pressure." },
  "792": { name:"Türkiye",             alpha2:"TR", risk:5,  region:"Europe/Middle East",tags:["terrorism","political","regional"],       info:"Kurdish PKK conflict, Syria border tensions, political authoritarianism under Erdoğan. NATO member." },
  "800": { name:"Uganda",              alpha2:"UG", risk:6,  region:"Sub-Saharan Africa",tags:["authoritarian","terrorism"],               info:"Museveni 35+ years in power. ADF terrorism, LRA remnants. Human rights abuses." },
  "804": { name:"Ukraine",             alpha2:"UA", risk:10, region:"Europe",            tags:["war","invasion"],                          info:"Russia's full-scale invasion ongoing. Active frontlines across east/south. Missile attacks on cities. Existential conflict." },
  "784": { name:"UAE",                 alpha2:"AE", risk:3,  region:"Middle East",       tags:[],                                          info:"Stable, safe, wealthy authoritarian state. Strict laws, zero tolerance for crime." },
  "826": { name:"United Kingdom",      alpha2:"GB", risk:2,  region:"Europe",            tags:["terrorism","political"],                   info:"Terrorism vigilance. Post-Brexit political turbulence. Generally very safe." },
  "840": { name:"United States",       alpha2:"US", risk:3,  region:"North America",     tags:["political","crime"],                       info:"Political polarisation, gun violence, but strong institutions and overall stable." },
  "858": { name:"Uruguay",             alpha2:"UY", risk:2,  region:"South America",     tags:[],                                          info:"Most peaceful country in South America. Strong democracy, low corruption." },
  "860": { name:"Uzbekistan",          alpha2:"UZ", risk:5,  region:"Central Asia",      tags:["authoritarian"],                           info:"Post-Karimov reforms improving but authoritarian. Crackdown on Karakalpakstan protests 2022." },
  "862": { name:"Venezuela",           alpha2:"VE", risk:8,  region:"South America",     tags:["authoritarian","humanitarian","crime"],    info:"Maduro dictatorship post-disputed election 2024. Economic collapse, 7M+ emigrated, crime, political prisoners." },
  "704": { name:"Vietnam",             alpha2:"VN", risk:4,  region:"Southeast Asia",    tags:["authoritarian"],                           info:"Communist single-party state. Improving economy. South China Sea disputes with China." },
  "887": { name:"Yemen",               alpha2:"YE", risk:10, region:"Middle East",       tags:["war","humanitarian","terrorism"],          info:"Houthis control north/west, attacking Red Sea shipping. Saudi coalition war. World's worst humanitarian crisis." },
  "716": { name:"Zimbabwe",            alpha2:"ZW", risk:7,  region:"Sub-Saharan Africa",tags:["authoritarian","economic","political"],   info:"Mnangagwa regime. Opposition MDC repressed. Economic crisis, hyperinflation, election fraud allegations." },
  "854": { name:"Burkina Faso",        alpha2:"BF", risk:9,  region:"West Africa",       tags:["coup","terrorism","jihadist"],             info:"Two coups in 2022. Jihadists control ~40% of territory. Russian forces, aid cut." },
  "232": { name:"Eritrea",             alpha2:"ER", risk:8,  region:"Sub-Saharan Africa",tags:["authoritarian","isolated"],               info:"Africa's most repressive state. Indefinite national service, zero freedoms, mass imprisonment." },
  "270": { name:"Gambia",              alpha2:"GM", risk:4,  region:"West Africa",       tags:[],                                          info:"Post-Jammeh recovery, improving democracy and rule of law." },
  "624": { name:"Guinea-Bissau",       alpha2:"GW", risk:6,  region:"West Africa",       tags:["instability","narco"],                    info:"Chronic political instability, drug-trafficking hub, repeated coups." },
  "426": { name:"Lesotho",             alpha2:"LS", risk:5,  region:"Sub-Saharan Africa",tags:["political"],                              info:"Landlocked kingdom, political instability, coup attempts, surrounded by South Africa." },
  "480": { name:"Mauritius",           alpha2:"MU", risk:2,  region:"Sub-Saharan Africa",tags:[],                                          info:"Stable island democracy, high human development for Africa." },
  "748": { name:"Eswatini",            alpha2:"SZ", risk:5,  region:"Sub-Saharan Africa",tags:["authoritarian"],                          info:"Africa's last absolute monarchy. Pro-democracy protests, crackdown on opposition." },
  "834": { name:"Tanzania",            alpha2:"TZ", risk:4,  region:"Sub-Saharan Africa",tags:["political"],                              info:"Generally stable, improving democracy. Some terrorism threats near Mozambique border." },
  "646": { name:"Rwanda",              alpha2:"RW", risk:5,  region:"Sub-Saharan Africa",tags:["authoritarian","regional"],               info:"Kagame's efficient authoritarian state. Strong development but no political freedoms. DRC tensions." },
  "516": { name:"Namibia",             alpha2:"NA", risk:3,  region:"Sub-Saharan Africa",tags:[],                                          info:"One of Africa's most stable and peaceful nations." },
  "454": { name:"Malawi",              alpha2:"MW", risk:4,  region:"Sub-Saharan Africa",tags:["poverty","political"],                    info:"Very poor but relatively peaceful. Some political tensions." },
  "226": { name:"Eq. Guinea",          alpha2:"GQ", risk:6,  region:"Sub-Saharan Africa",tags:["authoritarian"],                          info:"Obiang family kleptocracy, oil wealth for elites, oppressive." },
  "276": { name:"Germany",             alpha2:"DE", risk:2,  region:"Europe",            tags:["political"],                               info:"Stable EU/NATO anchor, AfD rise monitored, terrorism vigilance." },
  "191": { name:"Croatia",             alpha2:"HR", risk:2,  region:"Europe",            tags:[],                                          info:"EU/NATO member, stable Adriatic state." },
  "688": { name:"Serbia",              alpha2:"RS", risk:4,  region:"Europe",            tags:["political","territorial"],                 info:"Kosovo tensions, EU aspirant, Russian ties, protests 2024–2025." },
  "807": { name:"North Macedonia",     alpha2:"MK", risk:3,  region:"Europe",            tags:[],                                          info:"NATO member, EU aspirant, improving stability." },
  "008": { name:"Albania",             alpha2:"AL", risk:3,  region:"Europe",            tags:["crime"],                                   info:"Organised crime, EU candidate, improving governance." },
  "352": { name:"Iceland",             alpha2:"IS", risk:1,  region:"Europe",            tags:[],                                          info:"World's most peaceful country, consistently #1 GPI." },
  "360": { name:"Indonesia",           alpha2:"ID", risk:4,  region:"Southeast Asia",    tags:["terrorism","separatism"],                  info:"Vast archipelago, Papua conflict, terrorism managed. Generally stable." },
};

// ── MAJOR WORLD EVENTS (map markers) ───────────────────────────
const MAJOR_EVENTS = [
  {
    id: "ukraine",
    name: "Ukraine–Russia War",
    lat: 49.0, lng: 31.5,
    type: "war",
    severity: 10,
    location: "Ukraine / Russia",
    info: "Russia's full-scale invasion launched February 2022. Active frontlines in Donetsk, Zaporizhzhia, Kherson, Kharkiv. Drone/missile strikes on Ukrainian cities. Europe's largest war since 1945.",
    started: "Feb 2022",
  },
  {
    id: "gaza",
    name: "Gaza War",
    lat: 31.5, lng: 34.4,
    type: "war",
    severity: 10,
    location: "Gaza Strip / Israel",
    info: "Israeli military campaign in Gaza following Hamas attacks of Oct 7, 2023. Mass civilian casualties, humanitarian blockade, displacement of 1.9M people. Ceasefire negotiations ongoing.",
    started: "Oct 2023",
  },
  {
    id: "sudan",
    name: "Sudan Civil War",
    lat: 15.5, lng: 32.5,
    type: "war",
    severity: 10,
    location: "Sudan",
    info: "War between Sudan Armed Forces (SAF) and Rapid Support Forces (RSF) since April 2023. Darfur genocide allegations. World's largest displacement crisis — 10M+ displaced. Khartoum in ruins.",
    started: "Apr 2023",
  },
  {
    id: "myanmar",
    name: "Myanmar Civil War",
    lat: 19.0, lng: 96.0,
    type: "war",
    severity: 10,
    location: "Myanmar",
    info: "Civil war following 2021 military coup. People's Defence Force + ethnic armies control large territory. Junta losing ground rapidly. 2M+ displaced. Regime conducting airstrikes on civilians.",
    started: "Feb 2021",
  },
  {
    id: "somalia",
    name: "Somalia / Al-Shabaab",
    lat: 5.5, lng: 46.0,
    type: "terrorism",
    severity: 9,
    location: "Somalia",
    info: "Al-Shabaab controls large rural areas, conducts regular bombings and raids. Drought and famine compounding crisis. AU peacekeeping mission ongoing.",
    started: "2006",
  },
  {
    id: "drc",
    name: "Eastern DRC Conflict",
    lat: -1.5, lng: 29.0,
    type: "war",
    severity: 9,
    location: "DR Congo (North Kivu)",
    info: "M23 rebellion (Rwanda-backed) holds Goma and North Kivu. 100+ armed groups active. World's largest humanitarian crisis, 7M+ displaced.",
    started: "2012 / resurgent 2022",
  },
  {
    id: "haiti",
    name: "Haiti Gang Crisis",
    lat: 18.9, lng: -72.3,
    type: "instability",
    severity: 9,
    location: "Haiti",
    info: "Gangs control 80% of Port-au-Prince. Viv Ansanm coalition of gangs dominating. Kenyan-led multinational security force deployed. Political vacuum since Moïse assassination.",
    started: "2021",
  },
  {
    id: "yemen",
    name: "Yemen / Houthi War",
    lat: 15.5, lng: 47.5,
    type: "war",
    severity: 10,
    location: "Yemen",
    info: "Houthis control Yemen's north; attacking commercial shipping in Red Sea disrupting global trade. Saudi coalition war continues. World's worst humanitarian crisis — 21M need aid.",
    started: "2015",
  },
  {
    id: "mali_sahel",
    name: "Sahel Jihadist Crisis",
    lat: 16.0, lng: -1.5,
    type: "terrorism",
    severity: 9,
    location: "Mali / Burkina Faso / Niger",
    info: "JNIM and ISGS jihadist groups control vast Sahel territory. Three military juntas ruling. Russian forces replacing French. Civilian massacres ongoing. 6M+ displaced.",
    started: "2012",
  },
  {
    id: "nigeria_multi",
    name: "Nigeria — Multiple Crises",
    lat: 10.0, lng: 8.5,
    type: "terrorism",
    severity: 8,
    location: "Nigeria",
    info: "Boko Haram/ISWAP active northeast. Banditry and kidnapping northwest. Biafra separatism southeast. Farmers-herders violence nationwide. Africa's most populous nation under stress.",
    started: "2009",
  },
  {
    id: "pakistan_ttp",
    name: "Pakistan — TTP Insurgency",
    lat: 33.5, lng: 70.0,
    type: "terrorism",
    severity: 8,
    location: "Pakistan / KPK",
    info: "TTP (Pakistani Taliban) surged post-Afghanistan takeover. Regular attacks on military and civilians in KPK and Balochistan. India tensions elevated after Kashmir incidents.",
    started: "2007 / resurgent 2022",
  },
  {
    id: "redsea",
    name: "Red Sea Shipping Crisis",
    lat: 14.5, lng: 43.0,
    type: "geopolitical",
    severity: 8,
    location: "Red Sea / Gulf of Aden",
    info: "Houthi forces attacking commercial vessels since Nov 2023. US/UK coalition strikes on Yemen. Global trade rerouted around Africa — adding weeks to voyages. Insurance costs soared.",
    started: "Nov 2023",
  },
  {
    id: "ethiopia_amhara",
    name: "Ethiopia — Amhara Conflict",
    lat: 11.5, lng: 38.0,
    type: "war",
    severity: 7,
    location: "Ethiopia (Amhara)",
    info: "Armed conflict between Amhara Fano militias and federal forces since 2023. Tigray ceasefire holding but fragile. Oromia insurgency parallel. Humanitarian access denied.",
    started: "2023",
  },
  {
    id: "caf",
    name: "Central African Republic",
    lat: 7.0, lng: 21.0,
    type: "war",
    severity: 9,
    location: "CAR",
    info: "Russian Africa Corps (formerly Wagner) prop up Touadera government. Armed groups control 75% of territory. Massacres of civilians documented. UN peacekeeping present.",
    started: "2013",
  },
  {
    id: "lebanon",
    name: "Lebanon Collapse & War",
    lat: 33.9, lng: 35.5,
    type: "instability",
    severity: 8,
    location: "Lebanon",
    info: "Israeli ground operation significantly degraded Hezbollah 2024. State remains collapsed — no president for 2+ years. Catastrophic economic crisis ongoing. Reconstruction blocked.",
    started: "2019 (crisis) / 2024 (war)",
  },
  {
    id: "taiwan",
    name: "Taiwan Strait Tensions",
    lat: 23.7, lng: 121.0,
    type: "geopolitical",
    severity: 7,
    location: "Taiwan / China",
    info: "China conducting regular PLA military exercises encircling Taiwan. US arms sales increasing. Strategic flashpoint for US-China confrontation. 23M people under existential threat.",
    started: "Ongoing / intensified 2022",
  },
  {
    id: "southchinasea",
    name: "South China Sea Disputes",
    lat: 12.5, lng: 114.0,
    type: "geopolitical",
    severity: 6,
    location: "South China Sea",
    info: "China vs Philippines, Vietnam, Malaysia, Brunei. Water cannon attacks on Philippine resupply vessels at Second Thomas Shoal. US patrols. Risk of accidental escalation.",
    started: "Ongoing",
  },
  {
    id: "ecuador_cartel",
    name: "Ecuador — Cartel Violence",
    lat: -1.8, lng: -78.2,
    type: "instability",
    severity: 7,
    location: "Ecuador",
    info: "Dramatic surge in organised crime since 2022. Prison massacres, political assassinations, TV studio seized. States of emergency and military deployment. Sinaloa/Gulf cartel presence.",
    started: "2022",
  },
  {
    id: "mozambique_cabo",
    name: "Mozambique — Cabo Delgado",
    lat: -13.3, lng: 40.5,
    type: "terrorism",
    severity: 7,
    location: "Mozambique (North)",
    info: "ISIL-affiliated Ansar al-Sunna Wa Jama'a insurgency. 1M+ displaced. Rwandan and SADC forces maintaining Mocímboa da Praia. LNG projects severely delayed.",
    started: "2017",
  },
  {
    id: "mexico",
    name: "Mexico Cartel Wars",
    lat: 24.5, lng: -104.0,
    type: "instability",
    severity: 7,
    location: "Mexico",
    info: "Sinaloa cartel fracturing. CJNG expanding territory. Mass graves discovered routinely. Journalist killings highest in world. Fentanyl crisis driving US pressure.",
    started: "2006",
  },
  {
    id: "israel_iran",
    name: "Israel–Iran Confrontation",
    lat: 32.5, lng: 53.0,
    type: "geopolitical",
    severity: 8,
    location: "Middle East",
    info: "Direct missile/drone exchanges 2024. Iranian strikes on Israel, Israeli strikes on Iran. Nuclear programme advancing. Proxy war through Hezbollah, Hamas, Houthis.",
    started: "Escalated 2024",
  },
  {
    id: "south_sudan",
    name: "South Sudan Civil Crisis",
    lat: 7.0, lng: 30.0,
    type: "war",
    severity: 9,
    location: "South Sudan",
    info: "Renewed fighting undermining 2018 peace deal. Kiir-Machar standoff. Famine conditions across country. Oil revenue fuels conflict rather than development.",
    started: "2013 / renewed 2024",
  },
  {
    id: "north_korea",
    name: "North Korea — Missile Tests",
    lat: 39.0, lng: 127.5,
    type: "geopolitical",
    severity: 8,
    location: "North Korea",
    info: "ICBM tests, new warhead deployments, troops sent to Russia. Kim Jong-un declares permanent war posture. Nuclear arsenal expanding. Conventional threat to South Korea elevated.",
    started: "Ongoing",
  },
  {
    id: "syria_post",
    name: "Syria — Post-Assad Chaos",
    lat: 34.8, lng: 38.5,
    type: "instability",
    severity: 8,
    location: "Syria",
    info: "HTS controls Damascus and much of northwest after Assad's fall Dec 2023. ISIS active in central desert. Turkish, Kurdish (SDF), and Israeli forces all present. Reconstruction decade away.",
    started: "Dec 2023 (new phase)",
  },
];

// ── HELPER FUNCTIONS ───────────────────────────────────────────
function getFlag(alpha2) {
  if (!alpha2 || alpha2.length !== 2) return '🌐';
  return alpha2.toUpperCase().replace(/./g, c =>
    String.fromCodePoint(127397 + c.charCodeAt(0))
  );
}

function getRiskColor(risk) {
  const r = Math.round(Math.max(1, Math.min(10, risk || 5)));
  const colors = [
    null,
    '#0a5c2e', // 1: very safe
    '#196e38', // 2: safe
    '#3d8b40', // 3: generally safe
    '#76a130', // 4: low-moderate
    '#b4a020', // 5: moderate
    '#c87c10', // 6: elevated
    '#c44c00', // 7: high
    '#b82000', // 8: very high
    '#941000', // 9: critical
    '#5e0000', // 10: war zone
  ];
  return colors[r] || '#1c2e40';
}

function getRiskLabel(risk) {
  const r = Math.round(risk || 0);
  const labels = [
    'UNKNOWN', 'VERY SAFE', 'SAFE', 'GENERALLY SAFE',
    'LOW RISK', 'MODERATE', 'ELEVATED', 'HIGH RISK',
    'VERY HIGH', 'CRITICAL', 'WAR ZONE',
  ];
  return labels[Math.min(r, 10)] || 'UNKNOWN';
}

function getEventColor(type) {
  return {
    war:         '#ff2828',
    terrorism:   '#ff7700',
    instability: '#ffcc00',
    geopolitical:'#4488ff',
    crime:       '#cc8800',
  }[type] || '#888888';
}

function getTagClass(tag) {
  if (['war','invasion','genocide'].includes(tag))         return 'war';
  if (['terrorism','jihadist','armed groups'].includes(tag)) return 'terrorism';
  if (['political','instability','ethnic','separatism'].includes(tag)) return 'instability';
  if (['authoritarian','coup'].includes(tag))              return 'authoritarian';
  if (['crime','narco','gangs'].includes(tag))             return 'crime';
  return 'default';
}

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const mins = Math.floor((Date.now() - d) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTickerSource(src) {
  const s = (src || '').replace(/\s+/g, '-');
  return s.length > 12 ? s.slice(0, 12) : s;
}
