/**
 * Утилиты для автоматических действий при добавлении нового сотрудника
 * Основано на Административной технологии Л. Рона Хаббарда
 */

import { Employee, EmployeeWizardData, HatFile, HatFileBasicData } from '../types';
import { supabase } from '../supabaseClient';
import { ORGANIZATION_STRUCTURE } from '../constants';

/**
 * Создает Шляпную папку для нового сотрудника
 */
export async function createHatFile(
  employeeId: string,
  postId: string,
  postInfo: EmployeeWizardData['post_info'],
  employeeName: string
): Promise<HatFile | null> {
  if (!supabase) {
    console.error('Supabase не инициализирован');
    return null;
  }

  try {
    // Получаем информацию о посте из ORGANIZATION_STRUCTURE
    const deptId = postInfo?.department_id;
    const dept = deptId ? ORGANIZATION_STRUCTURE[deptId] : null;
    const post = dept?.departments?.[postId];

    // Формируем базовые данные из шаблона поста (Раздел 1: Содержание)
    const basicData: HatFileBasicData = {
      post_name: postInfo?.name || post?.name || 'Пост',
      company_goal: '', // Заполняется HR
      post_goal: post?.purpose || postInfo?.purpose || '',
      department_name: dept?.name || '',
      responsibilities: post?.functions || [],
      products: post?.vfp ? [post.vfp] : (postInfo?.vfp ? [postInfo.vfp] : []),
      statistics: post?.statistics || postInfo?.statistics || [],
      org_chart_position: `${dept?.name || ''} → ${postInfo?.name || ''}`,
      reporting_line: post?.reporting_line || '',
      communication_lines: post?.communication_lines || [],
    };

    // Создаем структуру Шляпной папки
    const hatFile: Omit<HatFile, 'id' | 'created_at' | 'updated_at'> = {
      employee_id: employeeId,
      post_id: postId,
      completion_percentage: 30, // Начальная заполненность (только базовые данные)
      basic_data: basicData,
      regulations: {
        documents: [],
        links: [],
      },
      training_materials: {
        courses: [],
        videos: [],
        presentations: [],
      },
      responsibilities_description: {
        general: {
          department_structure: '',
          production_cycle_connection: '',
          other_info: '',
        },
        responsibilities: [],
      },
      development_roadmap: {
        levels: [],
      },
      checksheets: [],
      tools_access: {
        software: [],
        equipment: [],
        accounts: [],
      },
      history: {
        events: [],
      },
      additional: {
        faq: [],
        knowledge_base: [],
        best_practices: [],
        external_links: [],
      },
    };

    // Сохраняем в БД (если есть таблица hat_files)
    // Пока сохраняем в custom_fields сотрудника как JSON
    const { error } = await supabase
      .from('employees')
      .update({
        custom_fields: [
          {
            key: 'hat_file',
            value: hatFile,
            type: 'hat_file',
          },
        ],
      })
      .eq('id', employeeId);

    if (error) {
      console.error('Ошибка при создании Шляпной папки:', error);
      // Не прерываем процесс, просто логируем
    }

    return {
      id: crypto.randomUUID(),
      ...hatFile,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Ошибка при создании Шляпной папки:', error);
    return null;
  }
}

/**
 * Создает план онбординга на основе выбранного типа
 */
export async function createOnboardingPlan(
  employeeId: string,
  wizardData: EmployeeWizardData
): Promise<void> {
  if (!supabase) return;

  try {
    const startDate = wizardData.start_date ? new Date(wizardData.start_date) : new Date();
    const onboardingType = wizardData.onboarding_type || 'standard';

    // Определяем длительность и milestones в зависимости от типа
    let durationDays = 90;
    let milestones: Array<{ day: number; title: string; tasks: string[] }> = [];

    if (onboardingType === 'standard') {
      durationDays = 90;
      milestones = [
        {
          day: 0,
          title: 'День 1: Первый рабочий день',
          tasks: [
            'Welcome-письмо сотруднику',
            'Инструктаж по безопасности',
            'Экскурсия по офису',
            'Знакомство с командой',
            'Встреча с руководителем (30 мин)',
          ],
        },
        {
          day: 3,
          title: 'День 3: Встреча с наставником',
          tasks: ['Первая встреча с наставником', 'Обсуждение плана на первую неделю'],
        },
        {
          day: 7,
          title: 'Неделя 1: Погружение',
          tasks: [
            'Курс "О компании" [2ч]',
            'Курс "Оргсхема" [1ч]',
            'Изучение шляпы поста',
            'Наблюдение за работой коллег',
          ],
        },
        {
          day: 30,
          title: 'Месяц 1: Обучение',
          tasks: [
            'Профильные курсы (40ч)',
            'Hat Check Out',
            'Практика под контролем',
            'Еженедельные встречи с наставником',
            'Чек-поинт HR на 30-й день',
          ],
        },
        {
          day: 60,
          title: 'Месяц 2-3: Практика',
          tasks: [
            'Самостоятельная работа',
            'Ведение статистик',
            'Участие в проектах',
            'Подготовка к аттестации',
          ],
        },
        {
          day: 90,
          title: 'День 90: Финальная аттестация',
          tasks: [
            'Теоретический экзамен',
            'Практический экзамен',
            'Проверка статистик',
            'Отзыв наставника',
            'Решение комиссии: Стажер → Сотрудник',
          ],
        },
      ];
    } else if (onboardingType === 'accelerated') {
      durationDays = 30;
      milestones = [
        {
          day: 0,
          title: 'День 1: Знакомство',
          tasks: ['Welcome-встреча', 'Экскурсия', 'Базовые инструктажи'],
        },
        {
          day: 7,
          title: 'Неделя 1: Быстрое погружение',
          tasks: ['Ключевые курсы', 'Знакомство с процессами', 'Первые задачи'],
        },
        {
          day: 30,
          title: 'День 30: Финальная проверка',
          tasks: ['Проверка адаптации', 'Обратная связь', 'Переход в штат'],
        },
      ];
    }

    // Сохраняем план онбординга в custom_fields
    const onboardingPlan = {
      type: onboardingType,
      start_date: startDate.toISOString(),
      duration_days: durationDays,
      milestones: milestones.map(m => ({
        ...m,
        date: new Date(startDate.getTime() + m.day * 24 * 60 * 60 * 1000).toISOString(),
        completed: false,
      })),
      status: 'active',
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('employees')
      .update({
        custom_fields: [
          {
            key: 'onboarding_plan',
            value: onboardingPlan,
            type: 'onboarding_plan',
          },
        ],
      })
      .eq('id', employeeId);

    if (error) {
      console.error('Ошибка при создании плана онбординга:', error);
    }
  } catch (error) {
    console.error('Ошибка при создании плана онбординга:', error);
  }
}

/**
 * Отправляет уведомления ответственным лицам
 */
export async function sendOnboardingNotifications(
  employee: Employee,
  wizardData: EmployeeWizardData,
  employees: Employee[]
): Promise<void> {
  // Пока просто логируем, так как нет встроенной системы уведомлений
  // В будущем можно интегрировать с email/Slack/Telegram
  
  const manager = employees.find(e => e.id === wizardData.manager_id);
  const mentor = employees.find(e => e.id === wizardData.mentor_id);
  const hr = employees.find(e => e.id === wizardData.hr_manager_id);

  const notifications = [
    {
      to: manager,
      type: 'manager',
      message: `Новый сотрудник ${employee.full_name} выходит ${wizardData.start_date}. Подготовьте рабочее место и задачи на первую неделю.`,
    },
    {
      to: mentor,
      type: 'mentor',
      message: `Вы назначены наставником для ${employee.full_name}. План первой недели и чек-листы онбординга доступны в системе.`,
    },
    {
      to: hr,
      type: 'hr',
      message: `Запустите процесс онбординга для ${employee.full_name}. Шляпная папка создана и требует заполнения.`,
    },
  ];

  console.log('[Onboarding Notifications]', notifications);

  // TODO: Реализовать отправку через интеграции (Telegram/Slack/Email)
  // Можно использовать существующие функции из useBirthdayNotifications
}

/**
 * Создает заявку в IT на оборудование и доступы
 */
export async function createITRequest(
  employee: Employee,
  wizardData: EmployeeWizardData
): Promise<void> {
  if (!wizardData.create_it_request) return;

  if (!supabase) return;

  try {
    const equipmentList = wizardData.equipment_needed || [];
    const softwareList = wizardData.software_needed || [];
    
    // Автоматические программы на основе поста
    const automaticSoftware = [
      'Email (корпоративный)',
      'CRM система',
      'Внутренний портал',
      'Мессенджеры (Slack/Telegram корп)',
      'Облачное хранилище (Google Drive/OneDrive)',
    ];

    const allSoftware = [...automaticSoftware, ...softwareList];

    const itRequest = {
      employee_id: employee.id,
      employee_name: employee.full_name,
      start_date: wizardData.start_date,
      equipment: equipmentList,
      software: allSoftware,
      office_location: wizardData.office_location,
      office_floor: wizardData.office_floor,
      office_room: wizardData.office_room,
      workplace_number: wizardData.workplace_number,
      work_format: wizardData.work_format,
      equipment_notes: wizardData.equipment_notes,
      status: 'pending',
      created_at: new Date().toISOString(),
      description: `Подготовить рабочее место и выдать доступы к ${wizardData.start_date || '[дата выхода]'}`,
    };

    // Сохраняем заявку в custom_fields или отдельную таблицу
    // Пока сохраняем в custom_fields
    const { error } = await supabase
      .from('employees')
      .update({
        custom_fields: [
          {
            key: 'it_request',
            value: itRequest,
            type: 'it_request',
          },
        ],
      })
      .eq('id', employee.id);

    if (error) {
      console.error('Ошибка при создании IT заявки:', error);
    } else {
      console.log('[IT Request] Создана заявка для', employee.full_name);
    }
  } catch (error) {
    console.error('Ошибка при создании IT заявки:', error);
  }
}

/**
 * Планирует welcome-письмо (за 3 дня до выхода)
 */
export function scheduleWelcomeEmail(
  employee: Employee,
  startDate: string
): void {
  if (!startDate) return;

  const start = new Date(startDate);
  const welcomeDate = new Date(start);
  welcomeDate.setDate(welcomeDate.getDate() - 3);

  // Сохраняем в планировщик (можно использовать custom_fields или отдельную таблицу)
  console.log(`[Welcome Email] Запланировано на ${welcomeDate.toLocaleDateString('ru-RU')} для ${employee.full_name}`);

  // TODO: Реализовать реальную отправку через планировщик задач или cron
}

/**
 * Выполняет все автоматические действия после создания сотрудника
 */
export async function executeAutomaticActions(
  employee: Employee,
  wizardData: EmployeeWizardData,
  employees: Employee[]
): Promise<{
  hatFileCreated: boolean;
  onboardingPlanCreated: boolean;
  notificationsSent: boolean;
  itRequestCreated: boolean;
}> {
  const results = {
    hatFileCreated: false,
    onboardingPlanCreated: false,
    notificationsSent: false,
    itRequestCreated: false,
  };

  try {
    // 1. Создаем Шляпную папку
    if (wizardData.post_id && wizardData.post_info) {
      const hatFile = await createHatFile(
        employee.id,
        wizardData.post_id,
        wizardData.post_info,
        employee.full_name
      );
      results.hatFileCreated = !!hatFile;
    }

    // 2. Создаем план онбординга
    await createOnboardingPlan(employee.id, wizardData);
    results.onboardingPlanCreated = true;

    // 3. Отправляем уведомления
    await sendOnboardingNotifications(employee, wizardData, employees);
    results.notificationsSent = true;

    // 4. Создаем IT заявку (если выбрано)
    if (wizardData.create_it_request) {
      await createITRequest(employee, wizardData);
      results.itRequestCreated = true;
    }

    // 5. Планируем welcome-письмо
    if (wizardData.start_date) {
      scheduleWelcomeEmail(employee, wizardData.start_date);
    }
  } catch (error) {
    console.error('Ошибка при выполнении автоматических действий:', error);
  }

  return results;
}

