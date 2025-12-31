/**
 * 필드별 작성자 추적 유틸리티
 * 팀 프로젝트에서 필드별로 작성자를 추적하여 수정 권한을 제어합니다.
 */

export interface FieldEditors {
  [fieldPath: string]: string // fieldPath -> editor user_id
}

/**
 * 객체에서 필드 경로 추출 (깊은 비교용)
 */
export function getFieldPaths(obj: any, prefix = ''): string[] {
  const paths: string[] = []
  
  if (obj === null || obj === undefined) {
    return paths
  }
  
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        paths.push(...getFieldPaths(item, `${prefix}[${index}]`))
      } else {
        paths.push(`${prefix}[${index}]`)
      }
    })
  } else if (typeof obj === 'object') {
    Object.keys(obj).forEach((key) => {
      // 메타데이터 필드는 제외
      if (key.startsWith('_')) {
        return
      }
      
      const newPath = prefix ? `${prefix}.${key}` : key
      const value = obj[key]
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        paths.push(...getFieldPaths(value, newPath))
      } else {
        paths.push(newPath)
      }
    })
  }
  
  return paths
}

/**
 * 필드 경로에 해당하는 값이 비어있는지 확인
 */
export function isFieldEmpty(obj: any, path: string): boolean {
  if (!obj || !path) return true
  
  const value = getFieldValue(obj, path)
  
  // 값이 비어있는지 확인
  if (value === null || value === undefined || value === '') {
    return true
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true
  }
  if (Array.isArray(value) && value.length === 0) {
    return true
  }
  if (typeof value === 'object' && Object.keys(value).length === 0) {
    return true
  }
  
  return false
}

/**
 * 두 데이터 객체를 비교하여 변경된 필드와 새로 추가된 필드를 추출
 */
export function getChangedFields(
  oldData: any,
  newData: any,
  currentUserId: string
): { [fieldPath: string]: string } {
  const newEditors: { [fieldPath: string]: string } = {}
  
  const oldPaths = getFieldPaths(oldData || {})
  const newPaths = getFieldPaths(newData || {})
  
  // 모든 필드 경로 확인
  const allPaths = new Set([...oldPaths, ...newPaths])
  
  allPaths.forEach((path) => {
    const oldValue = getFieldValue(oldData, path)
    const newValue = getFieldValue(newData, path)
    const wasEmpty = isFieldEmpty(oldData, path)
    const isEmpty = isFieldEmpty(newData, path)
    
    // 값이 변경되었거나, 비어있던 필드에 값이 들어간 경우
    if (wasEmpty && !isEmpty) {
      // 빈 필드에 값이 들어감 - 현재 사용자가 작성자
      newEditors[path] = currentUserId
    } else if (!wasEmpty && !isEmpty) {
      // 값 비교 (객체나 배열은 JSON.stringify로 비교)
      let valuesEqual = false
      if (typeof oldValue === 'object' && typeof newValue === 'object') {
        try {
          valuesEqual = JSON.stringify(oldValue) === JSON.stringify(newValue)
        } catch (e) {
          valuesEqual = oldValue === newValue
        }
      } else {
        valuesEqual = oldValue === newValue
      }
      
      if (!valuesEqual) {
        // 기존 필드 값이 변경됨 - 현재 사용자가 작성자 (권한 체크는 상위에서)
        newEditors[path] = currentUserId
      }
    } else if (!wasEmpty && isEmpty) {
      // 필드가 비워짐 - 작성자 정보 제거하지 않음 (보존)
    }
  })
  
  return newEditors
}

/**
 * 필드 경로에 해당하는 값을 가져옴
 */
function getFieldValue(obj: any, path: string): any {
  if (!obj || !path) return undefined
  
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)
  let value = obj
  
  for (const key of keys) {
    if (value === null || value === undefined) {
      return undefined
    }
    
    // 배열의 경우 숫자 인덱스로 접근
    if (Array.isArray(value)) {
      const index = parseInt(key, 10)
      if (isNaN(index) || index < 0 || index >= value.length) {
        return undefined
      }
      value = value[index]
    } else if (typeof value === 'object' && key in value) {
      value = value[key]
    } else {
      return undefined
    }
  }
  
  return value
}

/**
 * 필드 편집 권한 확인
 */
export function canEditField(
  fieldPath: string,
  fieldEditors: FieldEditors,
  currentUserId: string,
  currentData: any
): boolean {
  // 필드가 비어있으면 편집 가능
  const isEmpty = isFieldEmpty(currentData, fieldPath)
  if (isEmpty) {
    return true
  }
  
  // 작성자가 없으면 편집 가능 (기존 데이터 마이그레이션)
  const editorId = fieldEditors[fieldPath]
  if (!editorId) {
    console.log(`필드 ${fieldPath}: 작성자 정보 없음, 편집 허용 (마이그레이션)`)
    return true
  }
  
  // 작성자가 현재 사용자면 편집 가능
  const canEdit = editorId === currentUserId
  if (!canEdit) {
    console.log(`필드 ${fieldPath}: 작성자 ${editorId} !== 현재 사용자 ${currentUserId}, 편집 불가`)
  }
  return canEdit
}

/**
 * step_data에서 필드 편집자 정보 추출 및 제거
 */
export function extractFieldEditors(stepData: any): {
  data: any
  fieldEditors: FieldEditors
} {
  if (!stepData || typeof stepData !== 'object') {
    return { data: stepData, fieldEditors: {} }
  }
  
  const fieldEditors: FieldEditors = stepData._fieldEditors || {}
  const { _fieldEditors, ...data } = stepData
  
  return { data, fieldEditors }
}

/**
 * step_data에 필드 편집자 정보 추가
 */
export function mergeFieldEditors(
  stepData: any,
  fieldEditors: FieldEditors,
  newEditors: { [fieldPath: string]: string }
): any {
  const mergedEditors: FieldEditors = {
    ...fieldEditors,
    ...newEditors,
  }
  
  return {
    ...stepData,
    _fieldEditors: mergedEditors,
  }
}

