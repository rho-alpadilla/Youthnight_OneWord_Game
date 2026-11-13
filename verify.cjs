// Dependency-free behavior checks. Does not replace browser layout testing.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script); // Syntax check the actual embedded application.
function boot(saved, blocked = false) {
  const elements = new Map();
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) {
    const listeners = {};
    elements.set(match[1], {
      id: match[1], open: false, hidden: false, disabled: false, checked: true,
      value: '', textContent: '', innerHTML: '', style: {setProperty(key,value){this[key]=value;}}, listeners,
      classList: {toggle() {},add(){},remove(){}}, setAttribute() {}, scrollIntoView() {},focus(){},
      addEventListener(name, fn) { listeners[name] = fn; },
      showModal() { this.open = true; }, close() { this.open = false; }
    });
  }
  const events = {}, store = new Map(saved ? [['lifebeats-oneword-v1', saved]] : []);
  let now = 100000, pointerHit = null;
  class Clock extends Date { static now() { return now; } }
  const context = vm.createContext({
    console, Date: Clock, setInterval() {}, setTimeout() {}, clearTimeout() {},
    FormData: class { constructor(form) { this.data = form.fields||{}; } get(key) { return this.data[key]??null; } },
    document: {
      getElementById: id => { assert(elements.has(id), `Missing HTML element ${id}`); return elements.get(id); },
      addEventListener: (name, fn) => { events[name] = fn; },
      querySelector: selector => selector==='dialog[open]'?[...elements.values()].find(el => el.open):null, hidden: false,
      elementFromPoint: () => pointerHit,
      documentElement: {}, fullscreenElement: null
    },
    window: {addEventListener() {}},
    localStorage: {
      getItem(key) { if (blocked) throw Error('Storage blocked'); return store.get(key) ?? null; },
      setItem(key, value) { if (blocked) throw Error('Storage blocked'); store.set(key, value); }
    }
  });
  vm.runInContext(script, context);
  const run = text => vm.runInContext(text, context);
  return {
    run, get: id => elements.get(id), store, events,
    hit(node) { pointerHit=node; },
    state: () => JSON.parse(run('JSON.stringify(state)')),
    click(id) { const el = elements.get(id); assert(!el.disabled, `${id} should be enabled`); el.onclick(); },
    data(dataset) { events.click({target: {closest: () => ({dataset})}}); },
    advance(ms) { now += ms; run('updateTimer()'); }
  };
}
let checks = 0;
function check(value, expected, message) { assert.deepEqual(value, expected, message); checks++; }
const game = boot();
check(game.state().teams.length, 4, 'Exactly four teams');
check(game.run('CATEGORIES.reduce((n,c)=>n+c.items.length,0)'), 20, '20 questions');
check(game.run('JSON.stringify(CATEGORIES.map(c=>c.items.map(q=>q.slice(0,2))))'), JSON.stringify([
  [['Hair','Samson'],['Rooster','Peter'],['Dreams','Joseph'],['Lions','Daniel']],
  [['Walls','Jericho'],['Manger','Bethlehem'],['Tower','Babel'],['Crucifixion','Golgotha']],
  [['Noah','Ark'],['David','Sling'],['Moses','Staff'],['Judas','Silver coins']],
  [['Rainbow','Noah’s Flood / Covenant'],['Shout','Fall of Jericho'],['Loaves','Feeding of 5,000'],['Tomb','Resurrection']],
  [['Beginning','Genesis'],['Queen','Esther'],['Armor','Ephesians'],['Fruit','Galatians']]
]), 'Exact finalized content');
check(game.run('CATEGORIES.every(c=>c.items.every(q=>!q[0].includes(" ")))'), true, 'One-word clues');

game.data({question:'0-0'});
check(game.get('round-dialog').open, true, 'Tile opens round');
check(game.get('clue').textContent, 'Ready?', 'Clue initially concealed');
check(game.get('answer').innerHTML, '', 'Answer absent until reveal');
check(game.get('correct').disabled, true, 'Cannot score before reveal');
check(game.get('finish-round').disabled, true, 'Cannot finish an unopened clue');
game.click('reveal-clue');
check(game.get('clue').textContent, 'Hair', 'Reveal exact clue');
check(game.get('timer').textContent, '20', 'Round starts with 20 seconds');
check(game.get('correct').disabled, false, 'Correct is available without revealing answer first');
game.advance(3200);
check(game.get('timer').textContent, '17', 'Countdown reflects elapsed wall time');
game.click('timer-toggle');
game.advance(3000);
check(game.get('timer').textContent, '17', 'Pause holds remaining time');
game.click('timer-toggle');
game.advance(20000);
check(game.get('timer').textContent, '00', 'Timer stops at zero');
check(game.get('timer-toggle').disabled, true, 'Expired timer cannot resume');
game.click('timer-reset');
check(game.get('timer').textContent, '20', 'Timer resets to 20 seconds');
game.click('timer-toggle');
game.data({answerTeam:'1'});
check(game.run('deadline'), null, 'Recognizing a team pauses the timer');
game.click('incorrect');
check(game.state().teams[1].score, 0, 'Incorrect answer does not deduct points');
check(game.state().active.awaitingSteal, true, 'Incorrect offers a steal');
check(game.get('steal').hidden, false, 'Steal button is shown');
check(game.get('answer').innerHTML, '', 'Wrong answer leaves intended answer hidden');
game.run('incorrect()');
check(game.state().active.failed, [1], 'Duplicate incorrect action blocked');
game.data({answerTeam:'2'});
check(game.state().active.selected, 1, 'Stealing requires choosing the Steal option');
game.click('steal');
game.data({answerTeam:'1'});
check(game.state().active.selected, 1, 'Failed team cannot steal');
game.data({answerTeam:'2'});
check(game.state().active.selected, 2, 'Another team selected for steal');
check(game.get('timer').textContent, '20', 'Steal gets a fresh 20 seconds');
check(game.run('deadline !== null'), true, 'Steal timer starts automatically');
check(game.state().teams[2].score, 0, 'Selecting stealing team does not award points');
game.advance(2000);
check(game.get('timer').textContent, '18', 'Steal timer counts down');
game.click('correct');
check(game.get('answer').innerHTML.includes('Samson'), true, 'Correct reveals answer automatically');
check(game.state().teams[2].score, 10, 'Stealing team receives points');
check(game.get('answer-teams').innerHTML.includes('>10</strong>'), true, 'Updated total appears in the round immediately');
check(game.run('deadline'), null, 'Correct stops the timer');
game.data({answerTeam:'3'});
check(game.state().active.selected, 2, 'Scored team stays selected for the bonus');
game.run('award("correct")');
check(game.state().teams[2].score, 10, 'Duplicate award blocked');
game.click('bonus');
game.run('award("bonus")');
check(game.state().teams[2].score, 15, 'Bonus awarded once');
game.click('round-undo');
check(game.state().teams[2].score, 10, 'Undo bonus');
check(game.get('bonus').disabled, false, 'Undo restores bonus availability');
game.click('bonus');
game.click('finish-round');
check(game.state().turn, 1, 'Next chooser advances once despite steal');
check(game.state().played, ['0-0'], 'Mark played records tile');
check(game.get('round-dialog').open, false, 'Finish returns to board');
game.data({question:'0-0'});
check(game.get('round-dialog').open, false, 'Played tile cannot reopen');
game.click('undo-btn');
check(game.state().played.length, 0, 'Undo restores completed clue');
check(game.state().turn, 0, 'Undo restores choosing turn');
game.data({question:'0-0'});
game.click('finish-round');

game.data({question:'4-3'});
game.click('reveal-clue');
game.advance(2500);
game.data({close:'round-dialog'});
check(game.run('deadline'), null, 'Close pauses timer');
check(game.state().active.remaining, 17500, 'Close preserves remaining time');
game.data({question:'2-1'});
check(game.state().active.id, '4-3', 'Only one unfinished challenge');
const recovered = boot(game.store.get('lifebeats-oneword-v1'));
check(recovered.state().teams[2].score, 15, 'Refresh recovers scores');
check(recovered.state().played, ['0-0'], 'Refresh recovers played tiles');
check(recovered.state().active.id, '4-3', 'Refresh recovers active clue');
check(recovered.run('deadline'), null, 'Recovered timer paused');
check(recovered.get('answer').innerHTML, '', 'Refresh does not reveal hidden answer');

game.data({close:'round-dialog'});
game.click('names-btn');
game.get('names-form').onsubmit({preventDefault(){},target:{fields:{team1:'The Lions',team2:'Grace',team3:'Faith <3',team4:'Hope'}}});
check(game.state().teams.map(t=>t.name), ['The Lions','Grace','Faith <3','Hope'], 'Four editable names');
check(game.get('teams').innerHTML.includes('Faith &lt;3'), true, 'Names render safely');
game.data({calc:'3'});
function calculate(value, operation) {
  game.get('score-amount').value = String(value);
  game.get('score-form').onsubmit({preventDefault(){},submitter:{value:operation}});
}
calculate(30,'add'); check(game.state().teams[3].score,30,'Calculator adds');
calculate(7,'subtract'); check(game.state().teams[3].score,23,'Calculator subtracts');
calculate(-12,'set'); check(game.state().teams[3].score,-12,'Calculator sets negative total');
calculate(1.5,'add'); check(game.state().teams[3].score,-12,'Fractions rejected');
calculate(-5,'subtract'); check(game.state().teams[3].score,-12,'Negative subtract amount rejected');
game.data({score:'3',delta:'10'});check(game.state().teams[3].score,-2,'Quick +10');
game.data({score:'3',delta:'-10'});check(game.state().teams[3].score,-12,'Quick -10');
game.run('adjustScore(3, 1000012, "limit test")');check(game.state().teams[3].score,-12,'Score limit enforced');
game.data({close:'score-dialog'});
game.click('reset-btn');
check(game.state().teams[3].score,-12,'Opening reset does not reset');
game.click('confirm-reset');
check(game.state().teams[0].name,'The Lions','Reset keeps names when checked');
check(game.state().teams.every(t=>t.score===0),true,'Reset clears scores');
check(game.state().active,null,'Reset clears active question');
check(game.state().played.length,0,'Reset clears board');
check(game.run('history.length'),0,'Reset clears undo history');

// Finish an entire game through the same handlers used by the page.
for(let c=0;c<5;c++) for(let r=0;r<4;r++) {
  game.data({question:`${c}-${r}`});game.click('reveal-clue');
  game.data({answerTeam:'0'});game.click('correct');game.click('finish-round');
}
check(game.state().played.length,20,'All 20 challenges playable');
check(game.state().turn,0,'Turn rotation across complete game');
check(game.state().teams[0].score,500,'All values total 500 points');
check(game.get('winner').hidden,false,'Winner shown');
check(game.get('winner').innerHTML.includes('The Lions'),true,'Correct winner named');
game.run('adjustScore(1,500,"tie")');
check(game.get('winner').innerHTML.includes('It’s a tie!'),true,'Tie supported');
game.click('reset-btn');game.get('keep-names').checked=false;game.click('confirm-reset');
check(game.state().teams[0].name,'Team 1','Reset can clear names');

const blocked = boot(null,true);
check(blocked.get('save-warning').hidden,false,'Storage failure warning');
blocked.data({question:'0-0'});blocked.click('reveal-clue');blocked.click('correct');
check(blocked.state().teams[0].score,10,'Game works without storage');
const invalid = boot('{"version":1,"teams":[]}');
check(invalid.state().teams.length,4,'Invalid saved state falls back safely');

const direct = boot();
direct.data({question:'1-2'});direct.click('reveal-clue');direct.click('correct');
check(direct.state().teams[0].score,30,'Correct instantly scores for the choosing team by default');
check(direct.state().turn,0,'Awarding does not skip the bonus or advance the choosing turn');
direct.click('round-undo');
check(direct.state().teams[0].score,0,'Undo reverses instant points');
check(direct.get('answer').innerHTML,'','Undo hides the answer again');
direct.click('incorrect');direct.click('steal');
direct.data({answerTeam:'1'});direct.click('incorrect');direct.click('steal');
direct.data({answerTeam:'2'});direct.click('incorrect');direct.click('steal');
direct.data({answerTeam:'3'});direct.click('incorrect');
check(direct.state().teams.map(t=>t.score),[0,0,0,0],'All failed attempts leave scores unchanged');
check(direct.get('steal').hidden,true,'Steal ends when every team has tried');
check(direct.state().active.failed.length,4,'Four unique failed teams');
direct.click('reveal-answer');
check(direct.get('steal').hidden,true,'Showing answer keeps steals closed');
check(direct.get('correct').disabled,true,'Cannot award a failed team after showing answer');
direct.click('finish-round');
check(direct.state().played,['1-2'],'Unanswered clue can be marked played');
check(direct.state().turn,1,'Unanswered clue advances once');

const pending = boot();pending.data({question:'0-1'});pending.click('reveal-clue');pending.click('incorrect');pending.click('steal');
const pendingRecovered = boot(pending.store.get('lifebeats-oneword-v1'));
check(pendingRecovered.state().active.selectingSteal,true,'Refresh restores steal selection');
pendingRecovered.data({question:'0-1'});pendingRecovered.data({answerTeam:'2'});pendingRecovered.click('correct');
check(pendingRecovered.state().teams[2].score,20,'Recovered steal scores the selected team');

const legacyState = pending.state();
delete legacyState.active.failed;delete legacyState.active.awaitingSteal;delete legacyState.active.selectingSteal;
legacyState.active.penalized=[];legacyState.active.remaining=10000;legacyState.teams[1].score=45;
const upgraded=boot(JSON.stringify(legacyState));
check(upgraded.state().teams[1].score,45,'Existing version scores preserved on update');
check(upgraded.state().active.remaining,20000,'Existing clue upgraded to 20 seconds');
check(upgraded.state().active.failed,[],'Existing clue gets new steal state');
check(html.includes('A whole lot of faith'),false,'Tagline removed');
check(html.includes('Finish the open challenge to continue'),false,'Long turn message removed');
check(html.includes('steals welcome'),false,'Board footnote removed');
check(html.replace(/data:image\/[^;]+;base64,[^"]+/g,'').includes('10s'),false,'No outdated 10-second timer labels');
function saveTeams(env,fields={}) {
  env.get('names-form').fields=fields;
  env.get('names-form').onsubmit({preventDefault(){},target:env.get('names-form')});
  env.get('names-form').fields={};
}
function edit(env) { env.get('names-form').fields={}; env.click('names-btn'); }
const rosterGame=boot();
edit(rosterGame);rosterGame.click('add-team');rosterGame.click('add-team');
check(rosterGame.state().teams.length,4,'Draft additions wait for Save');
saveTeams(rosterGame,{team5:'Joy',team6:'Peace'});
check(rosterGame.state().teams.length,6,'Teams can be added beyond four');
check(rosterGame.state().teams[5].name,'Peace','Added team can be named');
check(rosterGame.state().teams[5].score,0,'New team starts at zero');
check(rosterGame.run('validState(state)'),true,'Expanded roster saves a valid state');
rosterGame.data({score:'5',delta:'10'});
rosterGame.run('reorderTeam(6,1)');
check(rosterGame.state().teams.map(t=>t.id),[6,1,2,3,4,5],'Direct board reorder');
check(rosterGame.state().teams[0].score,10,'Score follows team through reorder');
check(rosterGame.state().turn,0,'First team in pregame order chooses first');
const rosterRecovered=boot(rosterGame.store.get('lifebeats-oneword-v1'));
check(rosterRecovered.state().teams.map(t=>t.id),[6,1,2,3,4,5],'Order persists after refresh');
check(rosterRecovered.state().teams[0].score,10,'Added team score persists');

edit(rosterGame);rosterGame.data({moveTeam:'5',step:'-1'});
rosterGame.data({removeTeam:'2'});rosterGame.click('add-team');
rosterGame.data({close:'names-dialog'});
check(rosterGame.state().teams.map(t=>t.id),[6,1,2,3,4,5],'Cancel discards roster edits');
edit(rosterGame);rosterGame.get('names-form').fields={team1:'Renamed'};
rosterGame.click('add-team');
check(rosterGame.run('teamDraft.find(t=>t.id===1).name'),'Renamed','Adding preserves unsaved name input');
rosterGame.data({removeTeam:'2'});saveTeams(rosterGame);
check(rosterGame.state().teams.length,6,'Add and remove can be saved together');
check(rosterGame.state().teams.find(t=>t.id===1).name,'Renamed','Name input survives editor render');
check(rosterGame.state().teams.some(t=>t.id===2),false,'Removed team is gone');
rosterGame.click('undo-btn');
check(rosterGame.state().teams.map(t=>t.id),[6,1,2,3,4,5],'Undo restores removed team and prior order');
check(rosterGame.state().teams[0].score,10,'Undo keeps existing scores');

rosterGame.data({question:'0-0'});rosterGame.click('reveal-clue');
rosterGame.data({answerTeam:'4'});rosterGame.click('incorrect');
rosterGame.click('steal');rosterGame.data({answerTeam:'5'});
rosterGame.data({close:'round-dialog'});
rosterGame.run('reorderTeam(6,5)');
check(rosterGame.state().teams[rosterGame.state().turn].id,6,'Current choosing identity preserved during active clue');
check(rosterGame.state().teams[rosterGame.state().active.selected].id,5,'Stealing team identity follows reorder');
check(rosterGame.state().teams[rosterGame.state().active.failed[0]].id,4,'Failed team identity follows reorder');
check(rosterGame.run('validState(state)'),true,'Reordered active clue remains valid');
rosterGame.data({question:'0-0'});rosterGame.click('correct');
check(rosterGame.state().teams.find(t=>t.id===5).score,10,'Correct team gets points after reorder');
rosterGame.data({close:'round-dialog'});
edit(rosterGame);rosterGame.data({removeTeam:'5'});saveTeams(rosterGame);
check(rosterGame.state().active.resolved,true,'Removing scored team keeps question resolved');
check(rosterGame.state().active.awarded,null,'Removed awarded team reference cleared');
rosterGame.run('award("correct")');
check(rosterGame.state().teams.reduce((n,t)=>n+t.score,0),10,'Removed scorer cannot trigger a second award');
check(rosterGame.run('validState(state)'),true,'Removing scorer leaves valid saved state');
rosterGame.click('undo-btn');
check(rosterGame.state().teams[rosterGame.state().active.awarded].id,5,'Undo restores awarded team identity');
rosterGame.run('reorderTeam(5,1)');
rosterGame.data({question:'0-0'});rosterGame.click('bonus');
check(rosterGame.state().teams.find(t=>t.id===5).score,15,'Bonus follows winning team after reorder');
rosterGame.click('finish-round');
check(rosterGame.state().teams[rosterGame.state().turn].id,5,'Next turn uses the new order');

const changing=boot();changing.data({question:'0-0'});changing.click('reveal-clue');
changing.data({answerTeam:'2'});changing.data({close:'round-dialog'});
edit(changing);changing.data({removeTeam:'3'});saveTeams(changing);
check(changing.state().active.selectingSteal,true,'Removing answering team requires selecting a replacement');
changing.data({question:'0-0'});changing.data({answerTeam:'2'});changing.click('correct');
check(changing.state().teams.find(t=>t.id===4).score,10,'Replacement team scores normally');
changing.data({close:'round-dialog'});
edit(changing);changing.data({removeTeam:'1'});saveTeams(changing);
check(changing.state().teams[changing.state().turn].id,2,'Removing chooser selects next surviving team');
changing.data({question:'0-0'});changing.click('finish-round');
check(changing.state().teams[changing.state().turn].id,2,'Finishing after chooser removal does not skip the next team');

const one=boot();edit(one);
one.data({removeTeam:'4'});one.data({removeTeam:'3'});one.data({removeTeam:'2'});
one.data({removeTeam:'1'});saveTeams(one);
check(one.state().teams.length,1,'At least one team is retained');
one.data({question:'0-0'});one.click('reveal-clue');one.click('incorrect');
check(one.get('steal').hidden,true,'One-team game has no steal after a failed attempt');
one.click('finish-round');check(one.state().turn,0,'One-team turn rotates safely');
one.click('reset-btn');one.click('confirm-reset');
check(one.state().teams.length,1,'Reset can preserve custom roster');
one.click('reset-btn');one.get('keep-names').checked=false;one.click('confirm-reset');
check(one.state().teams.length,4,'Reset can restore default roster');

const many=boot();edit(many);many.click('add-team');saveTeams(many);
many.data({question:'0-0'});many.click('reveal-clue');
for(let i=0;i<5;i++){
  if(i>0){many.click('steal');many.data({answerTeam:String(i)});}
  many.click('incorrect');
}
check(many.state().active.failed.length,5,'Steals support every added team');
check(many.get('steal').hidden,true,'Steals stop at dynamic team count');
many.data({close:'round-dialog'});edit(many);many.click('add-team');saveTeams(many);
check(many.get('steal').hidden,false,'New team can steal an unanswered active clue');

// Exercise the real pointer and keyboard event handlers against synthetic DOM nodes.
function dragNodes(id,scope='board'){
 const classes=new Set();
 const card={dataset:{teamId:String(id),teamScope:scope},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}};
 card.closest=()=>card;
 const handle={dataset:{dragTeam:String(id),teamScope:scope},tagName:'BUTTON',closest:s=>s==='[data-team-id]'?card:handle,
   setPointerCapture(){},hasPointerCapture:()=>true,releasePointerCapture(){}};
 return {card,handle,classes};
}
const dragging=boot(),source=dragNodes(1),target=dragNodes(3);
dragging.events.pointerdown({target:source.handle,button:0,pointerId:1,clientX:0,clientY:0,preventDefault(){}});
dragging.hit(target.card);
dragging.events.pointermove({pointerId:1,clientX:100,clientY:0});
check(target.classes.has('drop-target'),true,'Drag highlights destination');
dragging.events.pointerup({pointerId:1});
check(dragging.state().teams.map(t=>t.id),[2,3,1,4],'Pointer drop changes team order');
check(source.classes.size,0,'Drag styling clears after drop');
dragging.events.keydown({target:dragNodes(1).handle,key:'ArrowLeft',preventDefault(){}});
check(dragging.state().teams.map(t=>t.id),[2,1,3,4],'Keyboard arrow reorders team');
dragging.events.pointerdown({target:source.handle,button:0,pointerId:2,clientX:0,clientY:0,preventDefault(){}});
dragging.hit(target.card);dragging.events.pointermove({pointerId:2,clientX:100,clientY:0});
dragging.events.pointercancel({pointerId:2});
check(dragging.state().teams.map(t=>t.id),[2,1,3,4],'Cancelled drag leaves order unchanged');
edit(dragging);dragging.events.pointerdown({target:dragNodes(4,'editor').handle,button:0,pointerId:3,clientX:0,clientY:0,preventDefault(){}});
dragging.hit(dragNodes(2,'editor').card);dragging.events.pointermove({pointerId:3,clientX:100,clientY:0});dragging.events.pointerup({pointerId:3});
check(dragging.run('teamDraft[0].id'),4,'Pointer reorders draft teams');
saveTeams(dragging);check(dragging.state().teams[0].id,4,'Saving applies dragged draft order');

const oldVersion=boot();oldVersion.data({question:'1-0'});oldVersion.click('reveal-clue');oldVersion.click('correct');
const oldSave=oldVersion.state();oldSave.version=1;delete oldSave.nextTeamId;oldSave.teams.forEach(t=>delete t.id);delete oldSave.active.resolved;
const migrated=boot(JSON.stringify(oldSave));
check(migrated.state().version,2,'Previous four-team saves upgrade');
check(migrated.state().teams[0].score,10,'Migration preserves prior scores');
check(migrated.state().active.resolved,true,'Migration preserves already-awarded clue');
check(migrated.run('validState(state)'),true,'Migrated state validates');
const fiveTeamGame=boot();edit(fiveTeamGame);fiveTeamGame.click('add-team');saveTeams(fiveTeamGame);
for(let c=0;c<5;c++)for(let r=0;r<4;r++){
  fiveTeamGame.data({question:`${c}-${r}`});fiveTeamGame.click('reveal-clue');
  fiveTeamGame.data({answerTeam:'4'});fiveTeamGame.click('correct');fiveTeamGame.click('finish-round');
}
check(fiveTeamGame.state().turn,0,'Five-team turn rotation wraps across a complete game');
check(fiveTeamGame.state().teams[4].score,500,'Added team can score across all 20 clues');
check(fiveTeamGame.get('winner').innerHTML.includes('Team 5'),true,'Added team can win');
check(fiveTeamGame.run('validState(state)'),true,'Completed five-team game validates');
console.log(`PASS: ${checks} checks — dynamic teams, pointer/keyboard reorder, score identity, roster changes during clues, saved-state migration, and existing game behavior.`);
