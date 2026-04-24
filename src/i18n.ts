export type Language = 'en' | 'fr' | 'es' | 'zh';

interface Translations {
    // Column titles
    column_todo: string;
    column_in_progress: string;
    column_done: string;

    // Menu items
    menu_insert_kanban: string;
    command_insert_kanban: string;

    // Settings
    settings_language: string;
    settings_language_desc: string;
    settings_column_names: string;
    settings_column_names_desc: string;
    settings_column_count: string;
    settings_column_count_desc: string;
    settings_column_title: string;
    settings_column_name: string;
    settings_column_default_name: string;
    settings_column_marker: string;
    settings_column_marker_desc: string;
    settings_column_style: string;
    settings_style_none: string;
    settings_style_fade: string;
    settings_style_delete_line: string;
    settings_column_collapse: string;
    settings_column_collapse_desc: string;
    settings_center_board: string;
    settings_center_board_desc: string;
    settings_todo_column: string;
    settings_in_progress_column: string;
    settings_done_column: string;
    settings_delete_delay: string;
    settings_delete_delay_desc: string;
    board_unmatched_notice: string;
}

const translations: Record<Language, Translations> = {
    en: {
        column_todo: 'To Do',
        column_in_progress: 'In Progress',
        column_done: 'Done',
        menu_insert_kanban: 'Insert Kanban',
        command_insert_kanban: 'Insert Kanban Board',
        settings_language: 'Language',
        settings_language_desc: 'Choose your preferred language',
        settings_column_names: 'Column Names',
        settings_column_names_desc: 'Customize the names of your kanban columns',
        settings_column_count: 'ColumnNames',
        settings_column_count_desc: 'Number of columns to render ({min}-{max})',
        settings_column_title: 'Column {index}',
        settings_column_name: 'Column Name',
        settings_column_default_name: 'Column {index}',
        settings_column_marker: 'Column Marker',
        settings_column_marker_desc: 'Enter one marker character used in markdown checkboxes.',
        settings_column_style: 'Style',
        settings_style_none: 'None',
        settings_style_fade: 'Fade',
        settings_style_delete_line: 'Delete Line',
        settings_column_collapse: 'Collapse',
        settings_column_collapse_desc: 'Do not stretch this column to board height.',
        settings_center_board: 'Center Board',
        settings_center_board_desc: 'Center the kanban board horizontally',
        settings_todo_column: 'To Do Column',
        settings_in_progress_column: 'In Progress Column',
        settings_done_column: 'Done Column',
        settings_delete_delay: 'Delete Delay (seconds)',
        settings_delete_delay_desc: 'How long to hold a card outside the board before it can be deleted on drop.',
        board_unmatched_notice: '{count} tasks do not match any configured column. They are kept in source markdown.',
    },
    zh: {
        column_todo: '待办',
        column_in_progress: '进行中',
        column_done: '已完成',
        menu_insert_kanban: '插入看板',
        command_insert_kanban: '插入 Kanban 看板',
        settings_language: '语言',
        settings_language_desc: '选择你偏好的语言',
        settings_column_names: '列名',
        settings_column_names_desc: '自定义你的看板列名称',
        settings_column_count: 'ColumnNames',
        settings_column_count_desc: '要渲染的列数（{min}-{max}）',
        settings_column_title: '第 {index} 列',
        settings_column_name: '列名',
        settings_column_default_name: '列 {index}',
        settings_column_marker: '列匹配符号',
        settings_column_marker_desc: '只输入方括号内的单个符号字符。',
        settings_column_style: '样式',
        settings_style_none: 'None',
        settings_style_fade: '淡化',
        settings_style_delete_line: '删除线',
        settings_column_collapse: '坍缩',
        settings_column_collapse_desc: '开启后该列不再拉伸到看板整体高度。',
        settings_center_board: '居中看板',
        settings_center_board_desc: '让看板在水平方向居中显示',
        settings_todo_column: '待办列',
        settings_in_progress_column: '进行中列',
        settings_done_column: '已完成列',
        settings_delete_delay: '删除延迟（秒）',
        settings_delete_delay_desc: '卡片在看板外停留多久后，拖放松手时才可以被删除。',
        board_unmatched_notice: '有 {count} 条任务未匹配任何已配置列，已保留在源码中。',
    },
    fr: {
        column_todo: 'À faire',
        column_in_progress: 'En cours',
        column_done: 'Terminé',
        menu_insert_kanban: 'Insérer un Kanban',
        command_insert_kanban: 'Insérer un tableau Kanban',
        settings_language: 'Langue',
        settings_language_desc: 'Choisissez votre langue préférée',
        settings_column_names: 'Noms des colonnes',
        settings_column_names_desc: 'Personnalisez les noms de vos colonnes kanban',
        settings_column_count: 'ColumnNames',
        settings_column_count_desc: 'Nombre de colonnes à afficher ({min}-{max})',
        settings_column_title: 'Colonne {index}',
        settings_column_name: 'Nom de la colonne',
        settings_column_default_name: 'Colonne {index}',
        settings_column_marker: 'Symbole de colonne',
        settings_column_marker_desc: 'Saisissez un seul caractère de case à cocher.',
        settings_column_style: 'Style',
        settings_style_none: 'None',
        settings_style_fade: 'Fade',
        settings_style_delete_line: 'Barré',
        settings_column_collapse: 'Réduire',
        settings_column_collapse_desc: 'Ne pas étirer cette colonne à la hauteur du tableau.',
        settings_center_board: 'Centrer le tableau',
        settings_center_board_desc: 'Centrer le tableau kanban horizontalement',
        settings_todo_column: 'Colonne À faire',
        settings_in_progress_column: 'Colonne En cours',
        settings_done_column: 'Colonne Terminé',
        settings_delete_delay: 'Délai de suppression (secondes)',
        settings_delete_delay_desc: 'Combien de temps maintenir une carte à l\'extérieur du tableau avant qu\'elle ne soit supprimée au relâchement.',
        board_unmatched_notice: '{count} tâches ne correspondent à aucune colonne configurée. Elles sont conservées dans le markdown source.',
    },
    es: {
        column_todo: 'Por hacer',
        column_in_progress: 'En progreso',
        column_done: 'Hecho',
        menu_insert_kanban: 'Insertar Kanban',
        command_insert_kanban: 'Insertar tablero Kanban',
        settings_language: 'Idioma',
        settings_language_desc: 'Elige tu idioma preferido',
        settings_column_names: 'Nombres de columnas',
        settings_column_names_desc: 'Personaliza los nombres de tus columnas kanban',
        settings_column_count: 'ColumnNames',
        settings_column_count_desc: 'Cantidad de columnas a renderizar ({min}-{max})',
        settings_column_title: 'Columna {index}',
        settings_column_name: 'Nombre de columna',
        settings_column_default_name: 'Columna {index}',
        settings_column_marker: 'Símbolo de columna',
        settings_column_marker_desc: 'Ingresa un solo carácter del checkbox.',
        settings_column_style: 'Estilo',
        settings_style_none: 'None',
        settings_style_fade: 'Fade',
        settings_style_delete_line: 'Tachado',
        settings_column_collapse: 'Colapsar',
        settings_column_collapse_desc: 'No estirar esta columna a toda la altura del tablero.',
        settings_center_board: 'Centrar tablero',
        settings_center_board_desc: 'Centrar el tablero kanban horizontalmente',
        settings_todo_column: 'Columna Por hacer',
        settings_in_progress_column: 'Columna En progreso',
        settings_done_column: 'Columna Hecho',
        settings_delete_delay: 'Retraso de eliminación (segundos)',
        settings_delete_delay_desc: 'Cuánto tiempo mantener una tarjeta fuera del tablero antes de que se pueda eliminar al soltarla.',
        board_unmatched_notice: '{count} tareas no coinciden con ninguna columna configurada. Se mantienen en el markdown de origen.',
    },
};

export function t(key: keyof Translations, lang: Language): string {
    return translations[lang][key] || translations['en'][key];
}

export function tp(key: keyof Translations, lang: Language, params: Record<string, string>): string {
    let content = t(key, lang);
    for (const [paramKey, value] of Object.entries(params)) {
        content = content.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), value);
    }
    return content;
}
