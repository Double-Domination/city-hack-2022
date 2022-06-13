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

const appIntervals = [];
const cleanUpIntervals = () => {
  appIntervals.map((currentIntervalID) => {
    clearInterval(currentIntervalID);
  });

  appIntervals = [];
};

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
    this.currentPomodoro = null;
  }
  addFinishedPomodaoroRun() {
    this.performedPomadoroRuns.push(this.currentPomodoro);
    this.isActivePomodoroRun = false;
    this.currentPomodoro = null;
  }
  activePomodoroRun(recivedPomodoro) {
    this.isActivePomodoroRun = true;
    this.currentPomodoro = recivedPomodoro;
  }
}

class PomodoroRun {
  // all pomodoro runs has predefined duration 45 min
  constructor(targetOfRun) {
    this.targetOfRun = targetOfRun;
    this.isActive = true;
    this.isForceInterrupted = false;
    this.startTimestamp = new Date();
    this.durationTime = 0;
    this.delayId = setTimeout(() => {
      this.finishPomodoro();
    }, POMODORO_DURATION);
  }
  forceInterrrupt() {
    this.isActive = false;
    this.isForceInterrupted = true;
    this.endTimestamp = new Date();
    this.durationTime = this.endTimestamp - this.startTimestamp;
    this.durationTime = this.durationTime / 1000 / 60;
    clearInterval(this.delayId);
    this.startReflectionSession();
  }
  finishPomodoro() {
    this.isActive = false;
    this.endTimestamp = new Date();
    this.durationTime = this.endTimestamp - this.startTimestamp;
    this.durationTime = this.durationTime / 1000 / 60;
    this.startReflectionSession();
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

    ctx.scene.leave();
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

const stage = new Scenes.Stage([age, name, gender, wizardScene, initScene]);

bot.use(stage.middleware());

bot.telegram.setMyCommands([
  { command: 'learn', description: 'Начать учебную сессию' },
  { command: 'stoplearn', description: 'остановить учебную сессию' },
  { command: 'configure', description: 'Настроики обучения' },
  { command: 'delayed', description: 'Delayed msg' },
  { command: 'interval', description: 'interval msg' },
  { command: 'cleaninterval', description: 'clenup intervals' },
]);

bot.start(async (ctx) => {
  await ctx.reply(
    'Добро пожаловать, я помогу выучиться масксимально быстро и сохранить мотивацию.',
  );
  await ctx.reply('/configure');
});

bot.command('scene', async (ctx) => {
  await ctx.scene.enter('INIT_DIALOG');
});

bot.command('gender', async (ctx) => {
  await ctx.scene.enter('GENDER_DIALOG');
});

bot.command('learn', (ctx) => {
  ctx.reply('Цель забега: not implemented');

  return null;
});

// bot.command('wizard', (ctx) => wizardScene.enter('WIZARD1'));
bot.command('stoplearn', (ctx) => ctx.reply('учебная сессия остановвленна'));
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
    ctx.reply('interval msg 3000');
  }, 7000);

  ctx.reply(`interval is set  id${intervalID}`);
});

bot.command('cleaninterval', (ctx) => {
  ctx.reply('all interval cleared');
  cleanUpIntervals();
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
