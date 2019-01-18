#include "pkgser/CRC.h"
void CRC16(unsigned char* puchMsg, unsigned short usDataLen , unsigned char& uchCRCHi , unsigned char& uchCRCLo) /* ������unsigned short ���ͷ���CRC */
{

	unsigned uIndex; /* CRC ��ѯ������*/
	while (usDataLen--) /* ����������Ļ�����*/
	{
		uIndex = uchCRCLo ^ *puchMsg++; /* ����CRC */
		uchCRCLo = uchCRCHi ^ auchCRCHi[uIndex];
		uchCRCHi = auchCRCLo[uIndex];
	}
}


