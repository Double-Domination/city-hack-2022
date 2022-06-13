const CORE_ID = process.env.BOT_TOKEN;
const {
  Telegraf,
  Scenes,
  Context,
  Extra,
  Markup,
  Stage,
  state,
  session,
} = require('telegraf');
const { CallbackData } = require('@bot-base/callback-data');

const bot = new Telegraf(CORE_ID);

//utility sectiion
const POMODORO_DURATION = 60 * 1000 * 45; //45 min

let tmpLearnerData = {};

let performedLearnSessions = [];

let currentPomodoro = null;

let tempTargetRun = '';

// async function startRefSession(recivedRun) {
//   console.log(performedLearnSessions);
//   // return;
//   const reflectionsKeyboard = {
//     reply_markup: JSON.stringify({
//       inline_keyboard: [
//         [
//           { text: 'Крутяк!', callback_data: '1' },
//           { text: 'Не очень', callback_data: '2' },
//         ],
//       ],
//     }),
//   };
//   await ctx.reply('Как ощущения?', reflectionsKeyboard);
//   await ctx.on('callback_query', async (ctx) => {
//     recivedRun = await ctx.callbackQuery.data;
//   });
//   console.log(performedLearnSessions);
//   return;
// }

let appIntervals = [];
const cleanUpIntervals = () => {
  appIntervals.map((currentIntervalID) => {
    clearInterval(currentIntervalID);
  });

  appIntervals = [];
};
// checkStatistics every 90min to disable it execute /cleanintervals
// const intervalID = setInterval((ctx) => {
//   ctx.reply('Самое время чекнуть статисткику своей учёбы /statistic');
// }, 5000);

class LearnerRecord {
  constructor(
    name,
    city,
    prevWork,
    workPosition,
    educationTarget,
    initialKnowledge,
    age,
    educationProgramm,
  ) {
    this.name = name;
    this.city = city;
    this.prevWork = prevWork;
    this.workPosition = workPosition;
    this.educationTarget = educationTarget;
    this.initialKnowledge = initialKnowledge;
    this.age = age;
    this.educationProgramm = educationProgramm;
    this.performedPomadoroRuns = [];
    this.isActivePomodoroRun = false;
    // this.currentPomodoro = null;
  }
  addFinishedPomodaoroRun() {
    // this.performedPomadoroRuns.push(this.currentPomodoro);
    this.isActivePomodoroRun = false;
    // this.currentPomodoro = null;
  }
  activePomodoroRun(recivedPomodoro) {
    this.isActivePomodoroRun = true;
    // this.currentPomodoro = recivedPomodoro;
  }
}

class PomodoroRun {
  // all pomodoro runs has predefined duration 45 min
  constructor(targetOfRun, recivedCTX) {
    this.icx = recivedCTX;
    this.targetOfRun = targetOfRun;
    this.isActive = true;
    this.isForceInterrupted = false;
    this.startTimestamp = new Date();
    this.durationTime = 0;
    this.reflections = null;
    this.delayId = setTimeout(() => {
      this.forceInterrrupt();
    }, 60000 * 3);

    this.icx.reply(
      ' таймер на задание сработает через 3 мин в целях демонстрации',
    );
  }
  forceInterrrupt() {
    this.isActive = false;
    this.isForceInterrupted = true;
    this.endTimestamp = new Date();
    this.durationTime = this.startTimestamp - this.endTimestamp;
    this.durationTime = this.durationTime / 1000 / 60;
    clearInterval(this.delayId);
    this.icx.scene.enter('REFLECTION_DIALOG');
    performedLearnSessions.push(this);
    currentPomodoro = null;

    // startRefSession(this.reflections);
  }
  async finishPomodoro() {
    this.isActive = false;
    this.endTimestamp = new Date();
    this.durationTime = this.endTimestamp - this.startTimestamp;
    this.durationTime = this.durationTime / 1000 / 60;
    performedLearnSessions.push(this);
    // startRefSession(this.reflections);
    // startRefSession(this.reflections);
  }

  startReflectionSession() {
    return null;
  }
}

bot.use(session());
//Scenes

const age = new Scenes.BaseScene('AGE_DIALOG');
age.enter(async (ctx) => {
  tmpLearnerData = {};
  await ctx.reply('Сколько вам лет?');
});

age.on('text', async (ctx) => {
  const curInput = Number(ctx.message.text);
  if (curInput && curInput > 0) {
    await ctx.reply('здорово!');
    tmpLearnerData.age = ctx.message.text;
    // ctx.scene.leave();
    ctx.scene.enter('GENDER_DIALOG');
  } else {
    await ctx.reply('wrong input data');
    ctx.scene.reenter();
  }
});
age.on('message', (ctx) => {
  ctx.reply('must be a valid number');
});
////////////////////////////
const name = new Scenes.BaseScene('NAME_DIALOG');
name.enter(async (ctx) => {
  ctx.reply('Как вас зовут?');
  name.on('text', async (ctx) => {
    if (ctx.message.text.length > 2 && typeof ctx.message.text === 'string') {
      const rercivedName = ctx.message.text;
      await ctx.reply(`Привет ${rercivedName}!!!`);
      tmpLearnerData.name = rercivedName;
      console.log(ctx.session.LearnerData);

      // ctx.scene.leave();
      ctx.scene.enter('AGE_DIALOG');
    } else {
      ctx.reply('Введите нужные данные(строка более двух символов)');
      ctx.scene.reenter();
    }
  });
  name.on('message', (ctx) => {
    ctx.reply('data must be string');
  });
});
//////
const gender = new Scenes.BaseScene('GENDER_DIALOG');
gender.enter(async (ctx) => {
  const genderInlineKeybord = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [
          { text: 'Мужской', callback_data: '1' },
          { text: 'Женский', callback_data: '2' },
        ],
      ],
    }),
  };
  await ctx.reply('Ваш пол:', genderInlineKeybord);
  await gender.on('callback_query', async (ctx, msg) => {
    // console.log(ctx.session.LearnerData.gender);
    // console.log(ctx.callbackQuery.data);
    tmpLearnerData.gender = ctx.callbackQuery.data;
    await ctx.reply(`отлично!`);
    console.log(tmpLearnerData);

    ctx.scene.enter('LEARN_SESSION');
    // ctx.scene.leave();
  });
});

gender.on('text', async (ctx) => {
  const curInput = Number(ctx.message.text);
  if (curInput && curInput > 0) {
    await ctx.reply('thx for answer');
    ctx.scene.enter('NAME_DIALOG');
  } else {
    await ctx.reply('wrong input data');
    ctx.scene.reenter();
  }
});
gender.on('message', (ctx) => {
  ctx.reply('must be a valid number');
});
//////
const learnSession = new Scenes.BaseScene('LEARN_SESSION');
learnSession.enter(async (ctx) => {
  const startLearningSessionKeybord = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [
          { text: 'ДА', callback_data: '1' },
          { text: 'НЕТ', callback_data: '2' },
        ],
      ],
    }),
  };
  await ctx.reply(
    'Готовы начать учится прямо сейчас(всего 45 минут)?',
    startLearningSessionKeybord,
  );
  await learnSession.on('callback_query', async (ctx) => {
    // await ctx.reply(`отлично!`);
    // console.log(tmpLearnerData);
    if (ctx.callbackQuery.data === '1') {
      ctx.reply('Какая будет цель забега?');
      // await learnSession.on('text', async (ctx) => {
      //   const curInput = await ctx.message.text;
      //   curInput.log;
      //   if (curInput.length > 2) {
      //     // await ctx.reply('Цель должна быть строкой больше двух символов!');
      //     currentPomodoro = new PomodoroRun(curInput);
      //     await ctx.reply(
      //       `Отлично! Начинаем ${currentPomodoro.targetOfRun}. Я оповещу вас когда таймер закончится!`,
      //     );
      //     // await ctx.scene.reenter();
      //   } else {
      //     ctx.reply('wrong data!');
      //   }
      // });

      return;
    } else {
      currentPomodoro = null;
      await ctx.reply('Как будкте готовы - активируйте команду /learn в меню');
      ctx.scene.leave();
    }

    // ctx.scene.leave();
  });

  await learnSession.on('text', async (ctx) => {
    const curInput = await ctx.message.text;
    console.log(curInput);
    if (curInput.length > 2) {
      // await ctx.reply('Цель должна быть строкой больше двух символов!');
      currentPomodoro = new PomodoroRun(curInput, ctx);
      await ctx.reply(
        `Отлично! Начинаем ${currentPomodoro.targetOfRun}. Я оповещу вас когда таймер закончится!`,
      );
      ctx.scene.leave();
      // await ctx.scene.reenter();
    } else {
      ctx.reply('Должна быть строка больше 2 символов');
    }
  });

  // learnSession.on('message', (ctx) => {
  //   ctx.reply('Название цели должно быть текстовой строкой');
  // });
});

// await learnSession.on('text', async (ctx) => {
//   const curInput = Number(ctx.message.text);
//   if (curInput && curInput > 0) {
//     await ctx.reply('thx for answer');
//     ctx.scene.enter('NAME_DIALOG');
//   } else {
//     await ctx.reply('wrong input data');
//     ctx.scene.reenter();
//   }
// });
// learnSession.on('message', (ctx) => {
//   ctx.reply('must be a valid ');
// });

/////////
//////
const runReflection = new Scenes.BaseScene('REFLECTION_DIALOG');
runReflection.enter(async (ctx) => {
  const reflectionInlineKeybord = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [
          { text: 'Крутяк!!!', callback_data: 'good' },
          { text: 'Не очень', callback_data: 'bad' },
        ],
      ],
    }),
  };
  await ctx.reply('Как прошло,', reflectionInlineKeybord);
  await runReflection.on('callback_query', async (ctx, msg) => {
    // console.log(ctx.session.LearnerData.gender);
    // console.log(ctx.callbackQuery.data);
    tmpLearnerData.tmpReflection = await ctx.callbackQuery.data;
    await ctx.reply(`отлично!`);
    // console.log(tmpLearnerData);
    // console.log(tmpLearnerData.length);

    // ctx.scene.enter('LEARN_SESSION');
    ctx.scene.leave();
  });
  ctx.scene.leave();
});

// runReflection.on('text', async (ctx) => {
//   const curInput = Number(ctx.message.text);
//   if (curInput && curInput > 0) {
//     await ctx.reply('thx for answer');
//     ctx.scene.enter('NAME_DIALOG');
//   } else {
//     await ctx.reply('wrong input data');
//     ctx.scene.reenter();
//   }
// });
runReflection.on('message', (ctx) => {
  ctx.reply('must be a valid data');
  ctx.scene.leave();
});
//////

//////////

const wizardScene = new Scenes.WizardScene(
  'WIZARD_DIALOG',

  (ctx) => {
    ctx.reply('whats your name');
    ctx.wizard.state.learnerRecord = {};
    return ctx.wizard.next();
  },
  (ctx) => {
    if (ctx.message.text.length < 2) {
      ctx.reply('please enter real name');
      return;
    }

    ctx.wizard.state.learnerRecord.fio = ctx.message.text;
    ctx.reply('Enter your e-mail');
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.learnerRecord.email = ctx.message.text;
    ctx.reply('Thank you for your replies, we will contact your soon');
    await ctx.reply(`collected data ${ctx.wizard.state.learnerRecord}`);
    return ctx.scene.leave();
  },
);

const initScene = new Scenes.WizardScene(
  'INIT_DIALOG',

  (ctx) => {
    ctx.reply(
      'Добро пожаловать, я помогу выучиться масксимально быстро и сохранить мотивацию.',
    );
    ctx.wizard.state.learnerTmpRecord = {};
    return ctx.wizard.next();
  },
  (ctx) => {
    ctx.reply('Как вас зовут?');

    return ctx.wizard.next();
  },
  (ctx) => {
    if (ctx.message.text.length < 2 && typeof ctx.message.text !== 'string') {
      ctx.reply('Пожалуйста введите рельное имя(строка более двух символов)');
      return;
    }

    ctx.wizard.state.learnerTmpRecord.learner = ctx.message.text;
    ctx.reply('Ваш город:');

    // city,
    if (ctx.message.text.length < 2 && typeof ctx.message.text !== 'string') {
      ctx.reply(
        'Пожалуйста введите реальный город(строка более двух символов)',
      );
      return;
    }

    ctx.wizard.state.learnerTmpRecord.city = ctx.message.text;
    return ctx.wizard.next();
  },
  //prevWork
  (ctx) => {
    ctx.reply('Ваш прошлый опыт работы?(область деятельности)');
    // ctx.wizard.state.contactData = {};
    return ctx.wizard.next();
  },
  (ctx) => {
    // validation example
    if (ctx.message.text.length < 2 && typeof ctx.message.text !== 'string') {
      ctx.reply('Должна быть строка болле 2 символов');
      return;
    }
    ctx.wizard.state.learnerTmpRecord.prevWork = ctx.message.text;
    // ctx.reply('Enter your e-mail');
    return ctx.wizard.next();
  },

  //
  // workPosition,
  (ctx) => {
    ctx.reply('Ваша прошлая должность?');
    // ctx.wizard.state.contactData = {};
    return ctx.wizard.next();
  },
  (ctx) => {
    // validation example
    if (ctx.message.text.length < 2 && typeof ctx.message.text !== 'string') {
      ctx.reply('Должна быть строка болле 2 символов');
      return;
    }
    ctx.wizard.state.learnerTmpRecord.workPosition = ctx.message.text;
    // ctx.reply('Enter your e-mail');
    return ctx.wizard.next();
  },

  async (ctx) => {
    ctx.reply('Thank you for your replies, we will contact your soon');
    await ctx.reply(
      `collected data ${JSON.stringify(ctx.wizard.state.learnerTmRecord)}`,
    );
    return ctx.scene.leave();
    // return ctx.wizard.next();
  },
);

// educationTarget,
// initialKnowledge,
// age,
// educationProgramm,

const stage = new Scenes.Stage([
  age,
  name,
  gender,
  wizardScene,
  initScene,
  learnSession,
  runReflection,
]);

bot.use(stage.middleware());

bot.telegram.setMyCommands([
  { command: 'learn', description: 'Начать учебную сессию' },
  { command: 'stoplearn', description: 'остановить учебную сессию' },
  { command: 'state', description: 'текущая задача' },
  { command: 'configure', description: 'Настроики обучения' },
  // { command: 'delayed', description: 'Delayed msg' },
  { command: 'statistic', description: 'статистика учёбы' },
  { command: 'interval', description: 'напоминания учёбы (демо раз в 2 мин)' },
  { command: 'cleaninterval', description: 'Убрать все напомнания' },
]);

bot.start(async (ctx) => {
  const generalKbd = {
    reply_markup: JSON.stringify({
      keyboard: [
        [{ text: '/learn', callback_data: 'btn1pushed' }],
        [{ text: '/stoplearn', callback_data: 'btn2Pushed' }],
        [{ text: '/state', callback_data: 'btn3Pushed' }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    }),
  };

  await ctx.reply(
    'Добро пожаловать, я помогу выучиться масксимально быстро и сохранить мотивацию.',
    generalKbd,
  );
  await ctx.reply('/configure');
});

bot.command('statistic', (ctx) => {
  const numberOfRuns = performedLearnSessions.length;
  let rateUser = 'lazy))/';
  switch (numberOfRuns) {
    case 0:
      rateUser = 'lazy))';
      break;

    case 1:
      rateUser = 'driven';
      break;

    case 2:
      rateUser = 'active';
      break;
    case 3:
      rateUser = 'engaged';
      break;

    case 4:
      rateUser = 'PRO';
      break;

    case numberOfRuns > 4 && numberOfRuns > 0:
      rateUser = 'PRO';
      break;

    default:
      rateUser = 'lazy))';
  }
  ctx.reply(`ваш рейтинг ${rateUser} количество забегов ${numberOfRuns}`);
  console.log(performedLearnSessions.length);
});

bot.command('scene', async (ctx) => {
  await ctx.scene.enter('INIT_DIALOG');
});

bot.command('gender', async (ctx) => {
  await ctx.scene.enter('GENDER_DIALOG');
});

bot.command('learn', async (ctx) => {
  if (currentPomodoro) {
    ctx.reply('У вас уже есть активная задача!');
  } else {
    currentPomodoro = 1;
    await ctx.scene.enter('LEARN_SESSION');
  }
});

// bot.command('wizard', (ctx) => wizardScene.enter('WIZARD1'));
bot.command('stoplearn', async (ctx) => {
  if (!currentPomodoro) {
    ctx.reply('Нечего останавливать) у Вас нет текущей задачи!');
  } else {
    currentPomodoro.forceInterrrupt();
    currentPomodoro = null;
    ctx.reply('учебная сессия остановленна!');
  }
});
bot.command('configure', async (ctx) => {
  await ctx.reply('настраиваем');
  await ctx.scene.enter('NAME_DIALOG');
});
bot.command('delayed', (ctx) => {
  const timeoutID = setTimeout(() => {
    ctx.reply('delayed 5000');
  }, 5000);
  ctx.reply(`timeout id id ${timeoutID}`);
});

bot.command('interval', (ctx) => {
  const intervalID = setInterval(() => {
    ctx.reply(
      'Будет напоминать раз в 1 мин посотреть статистику /statistic что бы отключить /cleaninterval',
    );
  }, 60000);
  appIntervals.push(intervalID);

  ctx.reply(
    `Будет напоминать раз в 2 мин посотреть статистику /statistic is set  id${intervalID} что бы отключить /cleaninterval`,
  );
});

bot.command('cleaninterval', (ctx) => {
  ctx.reply(' Все напоминания отключены');
  cleanUpIntervals();
});

bot.command('activenotifications', (ctx) => {
  // checkStatistics every 90min to disable it execute /cleanintervals
  const intervalID = setInterval((ctx) => {
    ctx.reply('Самое время чекнуть статисткику своей учёбы /statistic');
  }, 5000);
});

bot.command('state', async (ctx) => {
  if (currentPomodoro) {
    await ctx.reply(`Ваша текущая задача ${currentPomodoro.targetOfRun}`);
    const elapsedTime = new Date() - currentPomodoro.startTimestamp;
    const elapsedTimeInMin = elapsedTime / 1000 / 60;
    const elapsedTimeTrunc = Math.trunc(elapsedTimeInMin);

    await ctx.reply(`Прошло времени: ${elapsedTimeTrunc} min`);
  } else {
    ctx.reply('Нет Активной задачи, самое время начать!');
  }
});

bot.command('testpoll', (ctx) => {
  ctx.telegram.sendPoll(ctx.chat.id, 'Как прошло?', ['good', 'norm']);
});

bot.command('wizard', (ctx) => ctx.scene.enter('WIZARD_DIALOG'));

// bot.command('etext', (ctx) => {
//   const extractedTextPart = ctx.message.text;
//   const [, argsWithoutBotComand] = [...extractedTextPart.split(' ')];
//   return ctx.reply(argsWithoutBotComand);
// });

bot
  .launch()
  .then(() => console.log('-=Lunched=-'))
  .catch((err) => console.log(err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
